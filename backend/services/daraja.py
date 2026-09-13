"""Daraja OAuth and STK push integration for the StkPush resource."""

import base64
import os
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

import requests
from flask import current_app, has_app_context


def _setting(name, default=None):
    if has_app_context() and name in current_app.config:
        return current_app.config[name]
    return os.getenv(name, default)


def _error(message, status):
    return {"status": "error", "message": message}, status


def validate_phone_number(phone_number):
    """Return (valid, normalized 254 number, error message)."""
    if not isinstance(phone_number, str):
        return False, None, "Phone number must be a string."
    phone = phone_number.strip()
    if phone.startswith("+"):
        phone = phone[1:]
    if re.fullmatch(r"0[17][0-9]{8}", phone):
        phone = "254" + phone[1:]
    elif re.fullmatch(r"[17][0-9]{8}", phone):
        phone = "254" + phone
    if not re.fullmatch(r"254[17][0-9]{8}", phone):
        return False, None, "Enter a valid Kenyan mobile phone number."
    return True, phone, None


def trigger_stk_push(phone_number, amount):
    """Return (response body, HTTP status); acceptance is not payment completion.

    Uses sandbox unless FLASK_ENV is production. Credentials and callback URL
    come from Flask config or the existing DARAJA_* environment variables.
    Amounts must be whole KES; never silently round a customer's charge.
    """
    valid, phone, message = validate_phone_number(phone_number)
    if not valid:
        return _error(message, 400)
    try:
        value = Decimal(str(amount))
    except (InvalidOperation, ValueError, TypeError):
        return _error("Amount must be a valid number.", 400)
    if not value.is_finite():
        return _error("Amount must be a valid number.", 400)
    if value <= 0:
        return _error("Amount must be greater than 0.", 400)
    if value > 500000:
        return _error("Amount exceeds maximum limit of 500,000.", 400)
    if value != value.to_integral_value():
        return _error("Amount must be a whole number of KES.", 400)
    amount = int(value)

    names = ("DARAJA_CONSUMER_KEY", "DARAJA_CONSUMER_SECRET",
             "DARAJA_SHORTCODE", "DARAJA_PASSKEY", "DARAJA_CALLBACK_URL")
    settings = {name: _setting(name) for name in names}
    if any(not isinstance(v, str) or not v.strip() for v in settings.values()):
        return _error("M-Pesa payment service is not configured.", 500)
    callback = settings["DARAJA_CALLBACK_URL"].strip()
    try:
        parsed = urlparse(callback)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            return _error("M-Pesa callback URL must be a valid HTTPS URL.", 500)
    except ValueError:
        return _error("M-Pesa callback URL must be a valid HTTPS URL.", 500)

    production = str(_setting("FLASK_ENV", "development")).lower() == "production"
    base_url = "https://api.safaricom.co.ke" if production else "https://sandbox.safaricom.co.ke"
    try:
        auth_response = requests.get(
            base_url + "/oauth/v1/generate",
            params={"grant_type": "client_credentials"},
            auth=(settings["DARAJA_CONSUMER_KEY"], settings["DARAJA_CONSUMER_SECRET"]),
            timeout=(5, 30),
            allow_redirects=False,
        )
        if auth_response.status_code != 200:
            return _error("Unable to authenticate with M-Pesa payment service.", 502)
        auth_data = auth_response.json()
        token = auth_data.get("access_token") if isinstance(auth_data, dict) else None
        if not isinstance(token, str) or not token:
            return _error("Invalid response from M-Pesa authentication service.", 502)

        shortcode = settings["DARAJA_SHORTCODE"].strip()
        timestamp = datetime.now(ZoneInfo("Africa/Nairobi")).strftime("%Y%m%d%H%M%S")
        password = base64.b64encode(
            (shortcode + settings["DARAJA_PASSKEY"] + timestamp).encode("utf-8")
        ).decode("ascii")
        response = requests.post(
            base_url + "/mpesa/stkpush/v1/processrequest",
            headers={"Authorization": "Bearer " + token},
            json={
                "BusinessShortCode": shortcode,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": amount,
                "PartyA": phone,
                "PartyB": shortcode,
                "PhoneNumber": phone,
                "CallBackURL": callback,
                "AccountReference": "EliteNet",
                "TransactionDesc": "Internet package",
            },
            timeout=(5, 30),
            allow_redirects=False,
        )
        if response.status_code != 200:
            return _error("M-Pesa payment service rejected the request.", 502)
        data = response.json()
        if not isinstance(data, dict) or str(data.get("ResponseCode")) != "0":
            return _error("M-Pesa payment service did not accept the request.", 502)
        checkout = data.get("CheckoutRequestID")
        merchant = data.get("MerchantRequestID")
        if not isinstance(checkout, str) or not checkout or not isinstance(merchant, str) or not merchant:
            return _error("Invalid response from M-Pesa payment service.", 502)
        return {
            "status": "pending",
            "message": "STK push request sent successfully",
            "checkout_request_id": checkout,
            "merchant_request_id": merchant,
            "phone_number": phone,
            "amount": amount,
        }, 200
    except requests.Timeout:
        return _error("M-Pesa request timed out; payment request status is unknown.", 504)
    except requests.RequestException:
        return _error("Unable to communicate with M-Pesa payment service.", 502)
    except ValueError:
        return _error("Invalid response from M-Pesa payment service.", 502)
