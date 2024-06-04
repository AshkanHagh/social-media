import bcrypt from 'bcrypt';
import { db } from '../db/db';
import { UserTable } from '../db/schema';
import sendEmail from '../utils/sendMail';

export const hashPassword = async (password : string) : Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
}

export const insertUser = async (fullName : string, email : string, username : string, password : string) : Promise<void> => {
    await db.insert(UserTable).values({fullName, email, username, password});
}

export const sendMailForAuth = async (email : string, activationCode : string) => {
    await sendEmail({
        email: email,
        subject: 'Activate Your Account',
        text: 'Please use the following code to activate your account: ' + activationCode,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2 style="color: #4CAF50;">Activate Your Account</h2>
            <p>Please use the following code to activate your account:</p>
            <div style="border: 1px solid #ddd; padding: 10px; font-size: 20px; margin-top: 20px; text-align: center;">
              <strong>${activationCode}</strong>
            </div>
            <p>If you did not request this code, please ignore this email or contact our support team.</p>
            <p>Best regards,<br>The Support Team</p>
          </div>
        `
      });
}