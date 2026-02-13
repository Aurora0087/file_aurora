import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { IconBrandGoogle, IconLoader2, IconEye, IconEyeOff } from "@tabler/icons-react"
import { Link, useNavigate } from "@tanstack/react-router"
import { authClient } from "@/lib/auth-client"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
})

export function LoginForm() {
  const navigate = useNavigate()
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)
  // 1. Add state for password visibility
  const [showPassword, setShowPassword] = React.useState(false)

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
        callbackURL: "/dashboard",
      })

      if (error) {
        toast.error("Login failed", {
          description: error.message || "Invalid email or password.",
        })
      } else {
        toast.success("Welcome back!")
        navigate({ to: '/drive/my-drive' })
      }
    },
  })

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/drive/my-drive",
      })

      if (error) {
        toast.error("Google login failed", {
          description: error.message || "Could not connect to Google.",
        })
      }
    } catch (err) {
      toast.error("An unexpected error occurred during Google login.")
    } finally {
      setIsGoogleLoading(false)
    }
  }

  console.log(import.meta.env.VITE_BUN_SERVER_PUBLIC_URL);
  

  // Helper to determine if interaction should be blocked
  const isLoading = form.state.isSubmitting || isGoogleLoading

  return (
    <Card className=' md:min-w-84 ring-0 bg-transparent'>
      <CardHeader className=' text-center'>
        <CardTitle className='text-2xl font-bold'>Login to your account</CardTitle>
        <CardDescription className=' text-muted-foreground text-sm text-balance'>
          Enter your credentials to access your files.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <form
          id="login-form"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            {/* Email Field */}
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
                      autoComplete="email"
                      disabled={isLoading}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            {/* Password Field with Toggle */}
            <form.Field
              name="password"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <div className="flex items-center">
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                      <Link
                        to="/auth/forgot-password"
                        className="ml-auto text-sm underline-offset-4 hover:underline"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                    {/* 2. Wrap input in relative container */}
                    <div className="relative">
                      <Input
                        id={field.name}
                        name={field.name}
                        // 3. Dynamic type based on state
                        type={showPassword ? "text" : "password"}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        autoComplete="current-password"
                        disabled={isLoading}
                        className="pr-10" // Space for the icon
                      />
                      {/* 4. Show/Hide Button */}
                      <button
                        type="button" // Important: Prevents form submission
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      >
                        {showPassword ? (
                          <IconEyeOff size={18} aria-hidden="true" />
                        ) : (
                          <IconEye size={18} aria-hidden="true" />
                        )}
                        <span className="sr-only">
                          {showPassword ? "Hide password" : "Show password"}
                        </span>
                      </button>
                    </div>
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
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background text-muted-foreground px-2">
              Or continue with
            </span>
          </div>
        </div>

        <Button 
          variant="outline" 
          type="button" 
          onClick={handleGoogleLogin} 
          className="w-full"
          disabled={isLoading}
        >
          {isGoogleLoading ? (
            <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <IconBrandGoogle className="mr-2 h-4 w-4" />
          )}
          Google
        </Button>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 bg-transparent">
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button 
              type="submit" 
              form="login-form" 
              className="w-full" 
              disabled={!canSubmit || isLoading}
            >
              {isSubmitting && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          )}
        />
        <FieldDescription className="text-center">
          Don&apos;t have an account?{" "}
          <Link to="/auth/signup" className="text-primary underline underline-offset-4">
            Sign up
          </Link>
        </FieldDescription>
      </CardFooter>
    </Card>
  )
}