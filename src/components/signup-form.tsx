import * as React from 'react'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { IconBrandGoogle, IconLoader2 } from '@tabler/icons-react'
import { useNavigate, Link } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'

// 1. Zod Schema
const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters.'),
    email: z.string().email('Please enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {
  const navigate = useNavigate()

  // 1. State for form fields
  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validators: {
      onSubmit: signupSchema,
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signUp.email({
        email: value.email,
        password: value.password,
        name: value.name,
        callbackURL: '/dashboard',
      })

      if (error) {
        toast.error('Sign up failed', {
          description: error.message || 'Something went wrong.',
        })
      } else {
        toast.success('Account created successfully!')
        navigate({ to: '/drive/my-drive' })
      }
    },
  })

  const handleGoogleSignUp = async () => {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/dashboard',
    })
  }

  return (
    <Card className=' md:min-w-84 ring-0 bg-transparent'>
      <CardHeader className=' text-center'>
        <CardTitle className='text-2xl font-bold'>Create your account</CardTitle>
        <CardDescription className=' text-muted-foreground text-sm text-balance'>
          Fill in the form below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <form
          id="signup-form"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            {/* Full Name */}
            <form.Field
              name="name"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="John Doe"
                      required
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            {/* Email */}
            <form.Field
              name="email"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="m@example.com"
                      required
                    />
                    <FieldDescription>
                      We'll use this to contact you. We will not share your email with anyone else.
                    </FieldDescription>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            {/* Password */}
            <form.Field
              name="password"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      required
                    />
                    <FieldDescription>
                      Must be at last 8 charecters long.
                    </FieldDescription>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            {/* Confirm Password */}
            <form.Field
              name="confirmPassword"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Confirm Password</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      required
                    />
                    <FieldDescription>
                      Please confirm your password.
                    </FieldDescription>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />
          </FieldGroup>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-[.7rem] uppercase">
            <span className="text-muted-foreground px-2">Or continue with</span>
          </div>
        </div>

        <Button variant="outline" type="button" onClick={handleGoogleSignUp} className="w-full">
          <IconBrandGoogle className="mr-2 h-4 w-4" />
          Google
        </Button>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 bg-transparent">
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button 
              type="submit" 
              form="signup-form" 
              className="w-full" 
              disabled={!canSubmit}
            >
              {isSubmitting && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          )}
        />
        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <Link to="/auth/login" className="text-primary underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
