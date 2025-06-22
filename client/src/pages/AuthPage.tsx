import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff, Mail, Lock, User, Shield, Database, Sparkles } from "lucide-react";
import { Redirect } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export default function AuthPage() {
  const { user, loginMutation, registerMutation, forgotPasswordMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  const forgotPasswordForm = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const onLogin = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(data);
  };

  const onForgotPassword = (data: z.infer<typeof forgotPasswordSchema>) => {
    forgotPasswordMutation.mutate(data);
    setShowForgotPassword(false);
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="glass-card border-0 shadow-2xl">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Reset Password
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Enter your email to receive a reset link
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...forgotPasswordForm}>
                <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPassword)} className="space-y-6">
                  <FormField
                    control={forgotPasswordForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-200">Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="Enter your email"
                            className="glass-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForgotPassword(false)}
                      className="flex-1 glass-button"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={forgotPasswordMutation.isPending}
                      className="flex-1 glass-button-primary"
                    >
                      {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex">
      {/* Left side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 glass-tabs">
              <TabsTrigger value="login" className="glass-tab">Login</TabsTrigger>
              <TabsTrigger value="register" className="glass-tab">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card className="glass-card border-0 shadow-2xl">
                <CardHeader className="text-center pb-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Welcome Back
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300">
                    Sign in to your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 dark:text-gray-200">Email</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="Enter your email"
                                className="glass-input"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 dark:text-gray-200">Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Enter your password"
                                  className="glass-input pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto text-blue-600 dark:text-blue-400"
                          onClick={() => setShowForgotPassword(true)}
                        >
                          Forgot password?
                        </Button>
                      </div>
                      <Button
                        type="submit"
                        disabled={loginMutation.isPending}
                        className="w-full glass-button-primary"
                      >
                        {loginMutation.isPending ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card className="glass-card border-0 shadow-2xl">
                <CardHeader className="text-center pb-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Create Account
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300">
                    Join our premium platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 dark:text-gray-200">First Name</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="First name"
                                  className="glass-input"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 dark:text-gray-200">Last Name</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Last name"
                                  className="glass-input"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 dark:text-gray-200">Email</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="Enter your email"
                                className="glass-input"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 dark:text-gray-200">Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Create a password"
                                  className="glass-input pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        disabled={registerMutation.isPending}
                        className="w-full glass-button-primary"
                      >
                        {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero Section */}
      <div className="flex-1 hidden lg:flex items-center justify-center p-8 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
        <div className="text-center text-white max-w-md">
          <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
              <Database className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4 text-white">
            Premium Document Management
          </h1>
          <p className="text-xl mb-8 text-blue-100">
            Secure, scalable, and intuitive document management with advanced SEO project integration
          </p>
          <div className="space-y-4">
            <div className="glass-card bg-white/10 backdrop-blur-sm p-4 rounded-xl">
              <Shield className="w-6 h-6 text-blue-200 mx-auto mb-2" />
              <p className="text-sm text-blue-100">Enterprise-grade security</p>
            </div>
            <div className="glass-card bg-white/10 backdrop-blur-sm p-4 rounded-xl">
              <Sparkles className="w-6 h-6 text-purple-200 mx-auto mb-2" />
              <p className="text-sm text-purple-100">AI-powered organization</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}