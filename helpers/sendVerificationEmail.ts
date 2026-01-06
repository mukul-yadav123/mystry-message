import { resend } from "@/lib/resend";
import VerificationEmail from "@/emails/VerificationEmail";
import { ApiResponse } from "@/types/ApiResponse";

export async function sendVerificationEmail(
        email:string,
        username: string,
        verifyCode: string
): Promise<ApiResponse> 
{
    try {
    const { data, error } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: email,
      subject: 'Mystry Message: Verification code',
      react: VerificationEmail({username,otp: verifyCode}),
    });
        return {
            success: true, message: "Verification email send succesfully"
        }
    } catch (emailError) {
        console.log('Error send verification email', emailError)
        return {
            success: false, message: "Failed to send verification email"
        }
    }
}