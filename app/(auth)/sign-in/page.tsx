"use client";

import {zodResolver} from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import axios, { AxiosError } from 'axios'
import Link from 'next/link'
import { useEffect, useState } from 'react';
import {useDebounceValue} from 'usehooks-ts'
import { toast } from "sonner"
import { useRouter } from 'next/navigation';
import { signUpSchema } from '@/schemas/signUpSchema';
import { ApiResponse } from '@/types/ApiResponse';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const page = () => {
  const [username,setUsername] = useState('')
  const [usernameMessage,setUsernameMessage] = useState('')
  const [isCheckingUsername,setIsCheckingUsername] = useState(false)
  const [isSubmitting,setIsSubmitting] = useState(false)
  const router = useRouter()

  const debouncedUsername = useDebounceValue(username,300)

  //zod implementation
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: "",
      email: "",
      password: ""
    }
  })

  useEffect(() => {
    const checkUsernameUnique = async() => {
      if(debouncedUsername)
      {
        setIsCheckingUsername(true)
        setUsernameMessage('')
        try {
          const response = await axios.get(`/api/check-username-unique?username=${debouncedUsername}`)
          setUsernameMessage(response.data.message)
        } catch (error) {
          const axiosError = error as AxiosError<ApiResponse>;
          setUsernameMessage(axiosError.response?.data?.message ?? "Error checking username")
        }
        finally{
          setIsCheckingUsername(false)
        }
      }
    }
    checkUsernameUnique()
  },[debouncedUsername])

  const onSubmit = async(data: z.infer<typeof signUpSchema>) => {
    setIsSubmitting(true)
    try {
      const response = await axios.post<ApiResponse>('/api/sign-up',data)
      toast.success(response.data.message)
      router.replace(`/verify/${username}`)
    } catch (error) {
      console.error('Error in signup of user ',error)
      const axiosError = error as AxiosError<ApiResponse>
      toast.error(axiosError.response?.data?.message)
    }
    finally{
      setIsSubmitting(false)
    }
  }

  return (
        <div className="flex justify-center items-center min-h-screen bg-gray-800">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-6">
            Welcome Back to Mystry Message
          </h1>
          <p className="mb-4">Sign in to continue your secret conversations</p>
        </div>
        <Form {...form}>
         <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
             <FormField
              name="username"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                  <Input placeholder='username' 
                  {...field} 
                  onChange={(e) => {
                    field.onChange(e)
                    setUsername(e.target.value)
                  }}
                  />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
              <FormField
              name="email"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                  <Input placeholder='email' 
                  {...field} 
                  />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
              <FormField
              name="password"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                  <Input placeholder='password' 
                  type='password'
                  {...field} 
                  />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
         </form>
        </Form>
        </div>
        </div>
  )
}

export default page