import secrets
import string


def generate_login_code(prefix: str = "CL", length: int = 10) -> str:
    alphabet = string.ascii_uppercase + string.digits
    token = "".join(secrets.choice(alphabet) for _ in range(length))
    return f"{prefix}-{token}"
