import os
from decimal import Decimal

from flask import Flask
from flask_cors import CORS

from extensions import api, bcrypt, db, jwt, migrate
from config import config_by_name
from routes import __all__


def _ensure_default_admin(app):
	with app.app_context():
		db.create_all()

		from models.models import Admin

		admin = Admin.query.filter_by(username="admin").first()
		if admin is None:
			admin = Admin(username="admin")
			admin.set_password("Admin@2026")
			db.session.add(admin)
			db.session.commit()
		elif not admin.password_hash:
			admin.set_password("Admin@2026")
			db.session.commit()


def _ensure_default_packages(app):
	with app.app_context():
		from models.models import Package

		default_packages = [
			("30 Minutes", Decimal("5.00"), 30),
			("3 Hours", Decimal("10.00"), 180),
			("6 Hours", Decimal("20.00"), 360),
			("24 Hours", Decimal("30.00"), 1440),
			("Weekly", Decimal("170.00"), 10080),
			("Monthly", Decimal("600.00"), 43200),
		]

		for name, price, duration_minutes in default_packages:
			package = Package.query.filter_by(name=name).first()
			if package is None:
				db.session.add(
					Package(
						name=name,
						price=price,
						duration_minutes=duration_minutes,
						is_active=True,
					)
				)
			else:
				package.price = price
				package.duration_minutes = duration_minutes
				package.is_active = True

		db.session.commit()


def _setup_session_expiry_scheduler(app):
    """Fallback scheduler used when Render cron jobs are unavailable for the account or plan."""
    if os.getenv("RENDER_CRON_JOB_ID"):
        app.logger.info("Render cron job detected; session expiry is managed externally.")
        return

    scheduler_enabled = os.getenv("SESSION_EXPIRY_SCHEDULER", "false").strip().lower() in {"1", "true", "yes", "on"}
    if not scheduler_enabled and app.config.get("ENV") != "production":
        app.logger.info("Session expiry scheduler skipped in non-production config; Render cron is preferred.")
        return

    try:
        from flask_apscheduler import APScheduler
    except Exception:
        app.logger.warning("Flask-APScheduler is unavailable; fallback expiry scheduler disabled.")
        return

    scheduler = APScheduler()
    scheduler.init_app(app)
    scheduler.add_job(
        id="expire_hotspot_sessions",
        func="jobs.expire_sessions:expire_sessions",
        trigger="interval",
        minutes=5,
        replace_existing=True,
    )
    scheduler.start()
    app.extensions["session_expiry_scheduler"] = scheduler
    app.logger.info("Session expiry scheduler started with a 5-minute interval as fallback for Render cron limits.")


def create_app(config_name=None):
	app = Flask(__name__, instance_relative_config=True)

	selected_config = config_name or os.getenv("FLASK_ENV", "development")
	config_object = config_by_name.get(selected_config, config_by_name["development"])
	app.config.from_object(config_object)

	database_url = os.getenv("DATABASE_URL")
	if database_url and database_url.startswith("postgres://"):
		database_url = database_url.replace("postgres://", "postgresql://", 1)
		app.config["SQLALCHEMY_DATABASE_URI"] = database_url

	CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}})

	db.init_app(app)
	bcrypt.init_app(app)
	jwt.init_app(app)
	api.init_app(app)
	if migrate is not None:
		migrate.init_app(app, db)
	# Ensure model metadata is loaded before db.create_all or migrations.
	from models import models as _models  # noqa: F401

	# for blueprint in ALL_BLUEPRINTS:
	# 	app.register_blueprint(blueprint)

	_ensure_default_admin(app)
	_ensure_default_packages(app)
	_setup_session_expiry_scheduler(app)
	return app


app = create_app()

import os
try:
	print("[startup] CWD:", os.getcwd())
	print("[startup] SQLALCHEMY_DATABASE_URI:", app.config.get("SQLALCHEMY_DATABASE_URI"))
except Exception:
	pass


if __name__ == "__main__":
	# Allow overriding the port via the PORT environment variable (useful when 5000 is occupied)
	try:
		port = int(os.getenv("PORT", "5555"))
	except Exception:
		port = 5000
	app.run(host="0.0.0.0", port=port)
