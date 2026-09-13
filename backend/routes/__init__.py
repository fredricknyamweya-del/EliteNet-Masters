from routes import auth, admin ,stkpush ,mpesa_callback# Register resources with the shared API.
# from routes.admin import admin_bp
# from routes.callback import callback_bp
# from routes.stkpush import stkpush_bp
# from routes.mpesa_callback import mpesa_bp
# from routes.vouchers import vouchers_bp


__all__ = [
    auth,
    admin,
    stkpush,
    mpesa_callback
]
