import os
from decimal import Decimal

from flask import Flask, request
from flask_cors import CORS

from extensions import api, bcrypt, db, jwt, migrate
from config import config_by_name
from app.routes import __all__


def _ensure_default_admin(app):
	with app.app_context():
		db.create_all()

		from app.models import Admin

		admin_username = os.getenv("ADMIN_USERNAME", "admin")
		admin_password = os.getenv("ADMIN_PASSWORD", "1alutastation")
		if os.getenv("FLASK_ENV") == "production" and not os.getenv("ADMIN_PASSWORD"):
			raise RuntimeError("ADMIN_PASSWORD must be set in production")
		admin = Admin.query.filter_by(username=admin_username).first()
		if admin is None:
			admin = Admin(username=admin_username)
			admin.set_password(admin_password)
			db.session.add(admin)
			db.session.commit()
		elif not admin.password_hash:
			admin.set_password(admin_password)
			db.session.commit()


def _ensure_default_packages(app):
	with app.app_context():
		from app.models import Package

		default_packages = [
			("Smoke Plan", Decimal("2.00"), 5),
			("30min", Decimal("5.00"), 30),
			("45min", Decimal("7.00"), 45),
			("1hour", Decimal("10.00"), 60),
			("2hours", Decimal("15.00"), 120),
			("3hours", Decimal("20.00"), 180),
			("4hours", Decimal("30.00"), 240),
			("6hours", Decimal("35.00"), 360),
			("12hours", Decimal("45.00"), 720),
			("24hours", Decimal("55.00"), 1440),
			("Weekly", Decimal("175.00"), 10080),
			("Monthly", Decimal("595.00"), 43200),
		]
		existing_by_duration = {}
		for package in Package.query.order_by(Package.id.asc()).all():
			package.is_active = False
			existing_by_duration.setdefault(package.duration_minutes, package)

		for name, price, duration_minutes in default_packages:
			package = existing_by_duration.get(duration_minutes)
			if package is None:
				package = Package(duration_minutes=duration_minutes)
				db.session.add(package)
				existing_by_duration[duration_minutes] = package

			package.name = name
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
	app = Flask(__name__)

	selected_config = config_name or os.getenv("FLASK_ENV", "development")
	config_object = config_by_name.get(selected_config, config_by_name["development"])
	app.config.from_object(config_object)

	CORS(
		app,
		resources={
			r"/api/*": {
				"origins": [
					"http://localhost:3000",
					"http://127.0.0.1:3000",
					"https://elitenet-masters.onrender.com",
				],
				"supports_credentials": True,
				"allow_headers": ["Content-Type", "X-CSRF-TOKEN"],
				"methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			}
		},
	)

	allowed_origins = {
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"https://elitenet-masters.onrender.com",
	}

	@app.after_request
	def add_local_cors_headers(response):
		origin = request.headers.get("Origin")
		if origin in allowed_origins:
			response.headers["Access-Control-Allow-Origin"] = origin
			response.headers["Access-Control-Allow-Credentials"] = "true"
			response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-CSRF-TOKEN"
			response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
			response.headers.add("Vary", "Origin")
		return response

	db.init_app(app)
	bcrypt.init_app(app)
	jwt.init_app(app)
	api.init_app(app)
	if migrate is not None:
		migrate.init_app(app, db)
	# Ensure model metadata is loaded before db.create_all or migrations.
	
		from app import models as _models  # noqa: F401
		from app.models import RevokedToken

		@jwt.token_in_blocklist_loader
		def _is_revoked(jwt_header, jwt_payload):
			return db.session.get(RevokedToken, jwt_payload["jti"]) is not None

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
