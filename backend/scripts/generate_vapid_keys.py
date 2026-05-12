"""Generate a VAPID (ECDSA P-256) keypair and print it as URL-safe base64.

Run once locally; paste the output into Fly secrets and the PWA env file.
"""
from __future__ import annotations

import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def main() -> None:
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    private_number = private_key.private_numbers().private_value
    private_bytes = private_number.to_bytes(32, "big")

    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )

    print("VAPID_PUBLIC_KEY=" + _b64url(public_bytes))
    print("VAPID_PRIVATE_KEY=" + _b64url(private_bytes))


if __name__ == "__main__":
    main()
