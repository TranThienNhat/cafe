from werkzeug.security import generate_password_hash

# Thay mật khẩu bạn muốn tạo vào đây
password = "password123"

pwhash = generate_password_hash(password)
print(pwhash)