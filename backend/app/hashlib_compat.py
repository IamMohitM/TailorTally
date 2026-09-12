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
    if getattr(fn, "_is_hashlib_compat_safe", False):
        return fn

    def wrapper(*args, **kwargs):
        if "usedforsecurity" in kwargs:
            try:
                return fn(*args, **kwargs)
            except TypeError:
                kwargs_copy = dict(kwargs)
                kwargs_copy.pop("usedforsecurity", None)
                return fn(*args, **kwargs_copy)
        return fn(*args, **kwargs)

    try:
        wrapper._is_hashlib_compat_safe = True
    except (AttributeError, TypeError):
        pass

    return wrapper


_ALGORITHMS = ("md5", "sha1", "sha224", "sha256", "sha384", "sha512")


def apply_hashlib_compat_patch():
    for algo in _ALGORITHMS:
        if hasattr(hashlib, algo):
            setattr(hashlib, algo, _make_safe(getattr(hashlib, algo)))
    if hasattr(hashlib, "new"):
        hashlib.new = _make_safe(hashlib.new)
    try:
        import _hashlib
        for algo in _ALGORITHMS:
            name = f"openssl_{algo}"
            if hasattr(_hashlib, name):
                setattr(_hashlib, name, _make_safe(getattr(_hashlib, name)))
        if hasattr(_hashlib, "new"):
            _hashlib.new = _make_safe(_hashlib.new)
    except (ImportError, AttributeError):
        pass


# Apply compatibility patch on module import
apply_hashlib_compat_patch()
