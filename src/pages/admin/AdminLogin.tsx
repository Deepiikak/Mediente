import { useState } from "react";
import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Container,
  Stack,
  Alert,
  LoadingOverlay,
  Anchor,
  Group,
  Box,
  Flex,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
} from "@tabler/icons-react";
import MedienteLogo from "../../assets/Mediente-Logo.png"

import './AdminLogin.css';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import type { LoginCredentials } from '../../types/auth';

export default function AdminLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const navigate = useNavigate();
  const loginForm = useForm<LoginCredentials>({
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      email: (value) => {
        if (!value) return "Email is required";
        if (!/^\S+@\S+$/.test(value)) return "Invalid email format";
        return null;
      },
      password: (value) => {
        if (!value) return "Password is required";
        if (value.length < 8) return "Password must be at least 8 characters";
        return null;
      },
    },
  });

  const resetForm = useForm({
    initialValues: {
      email: "",
    },
    validate: {
      email: (value) => {
        if (!value) return "Email is required";
        if (!/^\S+@\S+$/.test(value)) return "Invalid email format";
        return null;
      },
    },
  });

  const handleLogin = async (values: LoginCredentials) => {
    if (isBlocked) {
      notifications.show({
        title: "Account Temporarily Blocked",
        message: "Too many failed attempts. Please reset your password.",
        color: "red",
        icon: <IconAlertCircle />,
      });
      return;
    }

    setIsLoading(true);
    // Clear any previous inline field errors before a new attempt
    loginForm.setErrors({});

    try {
      // Check failed attempts before login
      const attempts = await authService.getFailedAttemptsCount(values.email);
      if (attempts >= 3) {
        setIsBlocked(true);
        setFailedAttempts(attempts);
        notifications.show({
          title: "Too Many Failed Attempts",
          message: "Please reset your password to continue.",
          color: "red",
          icon: <IconAlertCircle />,
        });
        setIsLoading(false);
        return;
      }

      const response = await authService.login(values);

      if (response.error) {
        // Log failed attempt
        await authService.logFailedAttempt(values.email);
        setFailedAttempts((prev) => prev + 1);

        if (response.error.includes("Admin access only")) {
          notifications.show({
            title: "Access Denied",
            message: "Admin access only. Unauthorized user.",
            color: "red",
            icon: <IconAlertCircle />,
          });
        } else {
          notifications.show({
            title: "Login Failed",
            message: response.error,
            color: "red",
            icon: <IconAlertCircle />,
          });
        }

        if (failedAttempts >= 2) {
          setIsBlocked(true);
          setShowForgotPassword(true);
        }
      } else {
        notifications.show({
          title: "Login Successful",
          message: `Welcome back, ${response.user.name}!`,
          color: "green",
          icon: <IconCheck />,
        });

        // Redirect to admin dashboard
        navigate('/admin/dashboard');
        // Clear any lingering errors on success
        loginForm.setErrors({});
      }
    } catch (error) {
      console.error("Login error:", error);
      notifications.show({
        title: "Error",
        message: "An unexpected error occurred. Please try again.",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (values: { email: string }) => {
    setIsLoading(true);

    try {
      const response = await authService.resetPassword(values);

      if (response.success) {
        notifications.show({
          title: "Reset Link Sent",
          message: response.message,
          color: "green",
          icon: <IconCheck />,
        });
        setShowForgotPassword(false);
      } else {
        notifications.show({
          title: "Reset Failed",
          message: response.message,
          color: "red",
          icon: <IconAlertCircle />,
        });
      }
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: "Failed to send reset email. Please try again.",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px",
      }}
    >
      {/* Background Header */}
      <Box
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          background: "#2196f3",
          padding: "1px",
          zIndex: 1,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        <Group p="sm" gap="md">
         <img src={MedienteLogo} alt="" />
        </Group>
      </Box>

      <Container size="xl" mt={60}>
        <Flex
          direction={{ base: "column", md: "row" }}
          gap={{ base: "md", md: "md" }}
          align="center"
          justify="space-between"
        >
          {/* Left side - Illustration/Image section */}
          <Box
            flex={1}
            display={{ base: "none", md: "flex" }}
            style={{ justifyContent: "center", alignItems: "center" }}
          >
            <div
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "20px",
                padding: "0",
                textAlign: "center",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                position: "relative",
                minHeight: "340px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=600&q=80"
                alt="Movie production"
                style={{
                  width: "100%",
                  height: "240px",
                  objectFit: "cover",
                  display: "block",
                  borderTopLeftRadius: "20px",
                  borderTopRightRadius: "20px",
                }}
              />
              <div style={{ padding: "32px 24px 24px 24px" }}>
                <Text c="white" size="lg" fw={600} mb="xs" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                  Film Production Management
                </Text>
                <Text c="rgba(255,255,255,0.8)" size="sm" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
                  Bringing Stories to Life
                </Text>
              </div>
            </div>
          </Box>

          {/* Right side - Login form */}
          <Box flex={1} maw={400} w="100%">
            <Paper
              shadow="xl"
              p="xl"
              radius="lg"
              style={{
                position: "relative",
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
              }}
            >
              <LoadingOverlay visible={isLoading} />

              <Stack gap="lg">
                {/* Header */}
                <Box ta="center">
                  <Title order={2} size="h3" fw={700} c="black" mb="xs">
                    <span style={{ color: "#2196f3" }}>Welcome </span>to
                    Mediente Admin Dashboard 🚀
                  </Title>
                  {/* <Text c="dimmed" size="sm" mt="sm" ta="end">
                Sign in to your account
              </Text> */}
                </Box>

                {/* Failed attempts warning */}
                {failedAttempts > 0 && failedAttempts < 3 && (
                  <Alert
                    icon={<IconAlertCircle />}
                    color="yellow"
                    title="Login Attempt Warning"
                  >
                    {failedAttempts} failed attempt(s). {3 - failedAttempts}{" "}
                    attempt(s) remaining.
                  </Alert>
                )}

                {/* Blocked account alert */}
                {isBlocked && (
                  <Alert
                    icon={<IconAlertCircle />}
                    color="red"
                    title="Account Temporarily Blocked"
                  >
                    Too many failed attempts. Please reset your password.
                  </Alert>
                )}

                {!showForgotPassword ? (
                  /* Login Form */
                  <form onSubmit={loginForm.onSubmit(handleLogin)}>
                    <Stack gap="md">
                      <TextInput
                        // label="What is your e-mail?"
                        placeholder="What is your e-mail?"
                        leftSection={<IconMail />}
                        {...loginForm.getInputProps("email")}
                        disabled={isLoading}
                      />

                      <PasswordInput
                        // label="Enter your password"
                        placeholder="Enter your password"
                        leftSection={<IconLock />}
                        visibilityToggleIcon={({ reveal }) =>
                          reveal ? (
                            <IconEyeOff size={18} />
                          ) : (
                            <IconEye size={18} />
                          )
                        }
                        {...loginForm.getInputProps("password")}
                        disabled={isLoading}
                      />

                      <Button
                        type="submit"
                        fullWidth
                        size="md"
                        disabled={isLoading || isBlocked}
                        loading={isLoading}
                      >
                        Continue
                      </Button>

                      <Group justify="space-between" mt="xs">
                        <Text size="sm" c="dimmed">
                          By continuing you agree to our{" "}
                          <Anchor size="sm">Terms & Conditions</Anchor> and{" "}
                          <Anchor size="sm">Privacy Policy</Anchor>
                        </Text>
                      </Group>

                      <Group justify="center" mt="md">
                        <Text size="sm" c="dimmed">
                          Unable to Log in?{" "}
                          <Anchor
                            size="sm"
                            onClick={() => setShowForgotPassword(true)}
                            style={{ cursor: "pointer" }}
                          >
                            Reset Password
                          </Anchor>
                        </Text>
                      </Group>
                    </Stack>
                  </form>
                ) : (
                  /* Reset Password Form */
                  <form onSubmit={resetForm.onSubmit(handleForgotPassword)}>
                    <Stack gap="md">
                      <Title order={3} ta="center">
                        Reset Password
                      </Title>
                      <Text size="sm" c="dimmed" ta="center">
                        Enter your email address and we'll send you a reset link
                      </Text>

                      <TextInput
                        label="Email Address"
                        placeholder="Enter your email"
                        leftSection={<Text size="sm">📧</Text>}
                        {...resetForm.getInputProps("email")}
                        disabled={isLoading}
                      />

                      <Group grow>
                        <Button
                          variant="outline"
                          onClick={() => setShowForgotPassword(false)}
                          disabled={isLoading}
                        >
                          Back to Login
                        </Button>
                        <Button
                          type="submit"
                          disabled={isLoading}
                          loading={isLoading}
                        >
                          Send Reset Link
                        </Button>
                      </Group>
                    </Stack>
                  </form>
                )}
              </Stack>
            </Paper>
          </Box>
        </Flex>
      </Container>
    </div>
  );
}
