# 🔒 Security Guidelines

## Environment Configuration

### Backend Setup
1. Copy `backend/config.env.example` to `backend/config.env`
2. Fill in actual values for:
   - `JWT_SECRET` (generate a 64-character random string)
   - `MAIL_USER` and `MAIL_PASS` (your email credentials)
   - `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` 
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

### Frontend Setup
1. Create `frontend/.env` if needed
2. Add `REACT_APP_API_URL` and `REACT_APP_GOOGLE_CLIENT_ID`

## Default Credentials (For Development Only)

**⚠️ CHANGE THESE IN PRODUCTION:**

- **Admin:** username: `admin`, password: `admin123`
- **Delivery Agent:** email: `agent.demo@cms.com`, password: `agent123`

## Security Notes

- Never commit actual environment files
- Use strong, unique passwords in production
- Rotate JWT secrets regularly
- Enable 2FA where possible
- Review and update dependencies regularly 