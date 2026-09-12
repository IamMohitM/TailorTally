"""
Compatibility patch for hashlib across Python versions (especially Python 3.8 and FIPS/OpenSSL builds).

ReportLab passes `usedforsecurity=False` to hashlib functions (e.g., md5).
In Python 3.8 and certain OpenSSL builds, `_hashlib.openssl_md5` does not accept the
`usedforsecurity` keyword argument, causing:
TypeError: usedforsecurity is an invalid keyword argument for openssl_md5()

This module wraps hashlib functions to safely strip `usedforsecurity` when unsupported.
"""

import hashlib


def _make_safe(fn):
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except TypeError as err:
            if "usedforsecurity" in str(err):
                kwargs.pop("usedforsecurity", None)
                return fn(*args, **kwargs)
            raise
    return wrapper


def apply_hashlib_compat_patch():
    hashlib.md5 = _make_safe(hashlib.md5)
    hashlib.new = _make_safe(hashlib.new)
    try:
        import _hashlib
        if hasattr(_hashlib, "openssl_md5"):
            _hashlib.openssl_md5 = _make_safe(_hashlib.openssl_md5)
        if hasattr(_hashlib, "new"):
            _hashlib.new = _make_safe(_hashlib.new)
    except (ImportError, AttributeError):
        pass


# Apply compatibility patch on module import
apply_hashlib_compat_patch()
