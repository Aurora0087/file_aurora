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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { 
  IconBrandGoogle, 
  IconLoader2, 
  IconEye, 
  IconEyeOff 
} from "@tabler/icons-react"
import { Link, useNavigate } from "@tanstack/react-router"
import { authClient } from "@/lib/auth-client"

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string().min(1, "Please confirm your password."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export function SignupForm() {
  const navigate = useNavigate()
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)
  
  // 1. States for toggling visibility
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: signupSchema,
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signUp.email({
        email: value.email,
        password: value.password,
        name: value.name,
        callbackURL: "/drive/my-drive",
      })

      if (error) {
        toast.error("Signup failed", { description: error.message })
      } else {
        toast.success("Account created successfully!")
        navigate({ to: '/drive/my-drive' })
      }
    },
  })

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: "/drive/my-drive" })
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const isLoading = form.state.isSubmitting || isGoogleLoading

  return (
    <Card className="md:min-w-84 ring-0 bg-transparent border-none shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Enter your details to get started.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <form id="signup-form" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }}>
          <FieldGroup>
            {/* Name & Email (Omitted for brevity, same as before) */}
            <form.Field
              name="name"
              children={(field) => (
                <Field data-invalid={field.state.meta.isTouched && !field.state.meta.isValid}>
                  <FieldLabel>Full Name</FieldLabel>
                  <Input placeholder="John Doe" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} disabled={isLoading} />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            />

            <form.Field
              name="email"
              children={(field) => (
                <Field data-invalid={field.state.meta.isTouched && !field.state.meta.isValid}>
                  <FieldLabel>Email</FieldLabel>
                  <Input type="email" placeholder="m@example.com" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} disabled={isLoading} />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            />

            {/* Password Field with Toggle */}
            <form.Field
              name="password"
              children={(field) => (
                <Field data-invalid={field.state.meta.isTouched && !field.state.meta.isValid}>
                  <FieldLabel>Password</FieldLabel>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      className="pr-10" // Add padding to the right so text doesn't go under the icon
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled={isLoading}
                    />
                    <button
                      type="button" // Important: prevents form submission
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                    </button>
                  </div>
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            />

            {/* Confirm Password Field with Toggle */}
            <form.Field
              name="confirmPassword"
              children={(field) => (
                <Field data-invalid={field.state.meta.isTouched && !field.state.meta.isValid}>
                  <FieldLabel>Confirm Password</FieldLabel>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      className="pr-10"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                    </button>
                  </div>
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        {/* Google button (same as before) */}
        <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background text-muted-foreground px-2">Or continue with</span></div>
        </div>

        <Button variant="outline" type="button" onClick={handleGoogleLogin} className="w-full" disabled={isLoading}>
          {isGoogleLoading ? <IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> : <IconBrandGoogle className="mr-2 h-4 w-4" />}
          Google
        </Button>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 bg-transparent">
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button type="submit" form="signup-form" className="w-full" disabled={!canSubmit || isLoading}>
              {isSubmitting && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          )}
        />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/auth/login" className="text-primary underline underline-offset-4">Log in</Link>
        </p>
      </CardFooter>
    </Card>
  )
}