from routes.auth import auth_bp
from routes.admin import admin_bp
from routes.callback import callback_bp
from routes.stkpush import stkpush_bp
from routes.mpesa_callback import mpesa_bp
from routes.vouchers import vouchers_bp


ALL_BLUEPRINTS = [
    auth_bp,
    stkpush_bp,
    callback_bp,
    mpesa_bp,
    vouchers_bp,
    admin_bp,
]