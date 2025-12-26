import {z} from "zod"

export const messageSchema = z.object({
    content: z
    .string()
    .min(10, "Message should be atleast of 10 characters")
    .max(300, "Message must not be greater than 300 characters")
})