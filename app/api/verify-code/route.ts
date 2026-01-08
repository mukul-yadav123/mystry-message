import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User";

export async function POST(requset: Request)
{
    await dbConnect();
    try {
        const {username,code} = await requset.json()
        const user = await UserModel.findOne({
            username
        })

        if(!user)
        {
            return Response.json({
            success: false,
            message: "user not found"
        },{
            status: 500
        })
        }

        const isCodeValid = user.verifyCode === code
        const isCodeNotExpired = new Date(user.verifyCodeExpiry) > new Date()

        if(isCodeValid && isCodeNotExpired)
        {
            user.isVerified = true
            await user.save()
            return Response.json({
            success: true,
            message: "User verified"
            },{
                status: 200
            })
        } else if(!isCodeNotExpired)
        {
            return Response.json({
            success: false,
            message: "Verification Code expired"
        },{
            status: 400
        })
        }
        else
             return Response.json({
            success: false,
            message: "Incorrect verification code"
        },{
            status: 400
        })

    } catch (error) {
        console.log('Error verifying user ',error)
        return Response.json({
            success: false,
            message: "Error verifying user"
        },{
            status: 500
        })
    }
}