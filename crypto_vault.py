"""
MaxNews - Security and Crypto Vault
Gestisce la crittografia e la decifratura sicura a runtime delle chiavi API e credenziali sensibili.
Nessuna chiave sensibile e memorizzata in chiaro nel codice sorgente o esposta al client web.
"""

import os
import base64
import hashlib
import logging
from typing import Optional
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("MaxNews.CryptoVault")

# Pepper di derivazione interno offuscato a runtime per il vault
_P1 = b"MaxNews_Enterprise_Security"
_P2 = b"Gemini_AI_Secure_Vault_2026"
_SALT = hashlib.sha256(_P1 + b"::" + _P2).digest()
_VAULT_KEY = base64.urlsafe_b64encode(_SALT)

_CACHED_GEMINI_KEY: Optional[str] = None


def get_decrypted_gemini_key() -> str:
    """
    Decifra e restituisce strettamente in memoria la chiave API di Google Gemini.
    La chiave non viene mai scritta su disco ne inviata al browser client.
    """
    global _CACHED_GEMINI_KEY
    if _CACHED_GEMINI_KEY:
        return _CACHED_GEMINI_KEY

    # 1. Recupera il ciphertext da variabile d'ambiente .env
    cipher_text = os.getenv("GEMINI_KEY_CIPHER", "").strip()

    if cipher_text:
        try:
            f = Fernet(_VAULT_KEY)
            decrypted_bytes = f.decrypt(cipher_text.encode("utf-8"))
            _CACHED_GEMINI_KEY = decrypted_bytes.decode("utf-8").strip()
            return _CACHED_GEMINI_KEY
        except Exception as e:
            logger.error(f"Errore durante la decifratura della chiave Gemini da GEMINI_KEY_CIPHER: {e}")

    # Fallback su eventuale GEMINI_API_KEY se configurata manualmente in ambiente sicuro
    fallback_key = os.getenv("GEMINI_API_KEY", "").strip()
    if fallback_key:
        _CACHED_GEMINI_KEY = fallback_key
        return _CACHED_GEMINI_KEY

    return ""


def encrypt_api_key(plain_key: str) -> str:
    """Utility per generare il ciphertext cifrato di una chiave da inserire in .env."""
    f = Fernet(_VAULT_KEY)
    return f.encrypt(plain_key.encode("utf-8")).decode("utf-8")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        key_to_encrypt = sys.argv[1]
        print("CIPHERTEXT:", encrypt_api_key(key_to_encrypt))
    else:
        dec = get_decrypted_gemini_key()
        print("Vault Status: Active. Key loaded:", bool(dec), "Length:", len(dec))
