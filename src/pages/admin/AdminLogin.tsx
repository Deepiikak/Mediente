import { useState } from 'react';
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
  Flex
} from '@mantine/core';
import { useForm } from '@mantine/form';
import './AdminLogin.css';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck, IconEye, IconEyeOff } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import type { LoginCredentials } from '../../types/auth';

interface AdminLoginProps {}

export default function AdminLogin({}: AdminLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const navigate = useNavigate();
  const loginForm = useForm<LoginCredentials>({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => {
        if (!value) return 'Invalid login credential';
        if (!/^\S+@\S+$/.test(value)) return 'Invalid login credential';
        return null;
      },
      password: (value) => {
        if (!value) return 'Invalid login credential';
        if (value.length < 8) return 'Invalid login credential';
        return null;
      },
    },
  });

  const resetForm = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: (value) => {
        if (!value) return 'Email is required';
        if (!/^\S+@\S+$/.test(value)) return 'Invalid email format';
        return null;
      },
    },
  });

  const handleLogin = async (values: LoginCredentials) => {
    if (isBlocked) {
      notifications.show({
        title: 'Account Temporarily Blocked',
        message: 'Too many failed attempts. Please reset your password.',
        color: 'red',
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
          title: 'Too Many Failed Attempts',
          message: 'Please reset your password to continue.',
          color: 'red',
          icon: <IconAlertCircle />,
        });
        setIsLoading(false);
        return;
      }

      const response = await authService.login(values);

      if (response.error) {
        // Log failed attempt
        await authService.logFailedAttempt(values.email);
        setFailedAttempts(prev => prev + 1);

        if (response.error.includes('Admin access only')) {
          notifications.show({
            title: 'Access Denied',
            message: 'Admin access only. Unauthorized user.',
            color: 'red',
            icon: <IconAlertCircle />,
          });
        } else {
          // Show inline error on both fields to match the design
          const inlineErrorMessage = 'email or password is invalid please try again!';
          loginForm.setErrors({ email: inlineErrorMessage, password: inlineErrorMessage });
        }
        
        if (failedAttempts >= 2) {
          setIsBlocked(true);
          setShowForgotPassword(true);
        }
      } else {
        notifications.show({
          title: 'Login Successful',
          message: `Welcome back, ${response.user.name}!`,
          color: 'green',
          icon: <IconCheck />,
        });

        // Redirect to admin dashboard
        navigate('/admin/dashboard');
        // Clear any lingering errors on success
        loginForm.setErrors({});
      }
    } catch (error) {
      console.error('Login error:', error);
      notifications.show({
        title: 'Error',
        message: 'An unexpected error occurred. Please try again.',
        color: 'red',
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
          title: 'Reset Link Sent',
          message: response.message,
          color: 'green',
          icon: <IconCheck />,
        });
        setShowForgotPassword(false);
      } else {
        notifications.show({
          title: 'Reset Failed',
          message: response.message,
          color: 'red',
          icon: <IconAlertCircle />,
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to send reset email. Please try again.',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px',
      
    }}>
      {/* Background Header */}
      <Box 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          background: '#2196f3',
          padding: '1px',
          zIndex: 1,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}
      >
        <Group p="sm" gap="md">
         
          <Title order={1} c="white" ta="center" fw={700} size="1rem" style={{
            fontFamily: "Poppins",
            fontSize: "1.2rem",
            marginLeft: "10px"
          }}>
            MEDIENTE
          </Title>
   
        </Group>
      </Box>

      <Container size="xl" mt={60}>
        <Flex
          direction={{ base: 'column', md: 'row' }}
          gap="xl"
          align="center"
          justify="space-between"
        >
        {/* Left side - Illustration/Image section */}
        <Box 
          flex={1} 
          display={{ base: 'none', md: 'flex' }}
          style={{ justifyContent: 'center', alignItems: 'center' }}
        >
          {!showForgotPassword ? (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '40px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              {/* Film Production themed illustration */}
              <div style={{
                width: '200px',
                height: '200px',
                background: 'linear-gradient(135deg,rgb(107, 147, 255) 0%,rgb(255, 236, 87) 100%)',
                borderRadius: '20px',
                margin: '0 auto 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '60px',
                position: 'relative',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
              }}>
                🎬
                {/* Film strip decoration */}
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  background: '#2c2c2c',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '20px'
                }}>🎞️</div>
              </div>
              
              {/* Film production team representation */}
              <Group justify="center" gap="md" mb="lg">
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: '#e74c3c',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>🎥</div>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: '#9b59b6',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>🎭</div>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: '#f39c12',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>🎪</div>
              </Group>

              <Text c="white" size="lg" fw={600} mb="xs">
                Film Production Management
              </Text>
              <Text c="rgba(255,255,255,0.8)" size="sm">
                Bringing Stories to Life
              </Text>
            </div>
          ) : (
            // Password recovery themed illustration
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '40px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div style={{
                width: '220px',
                height: '220px',
                background: 'linear-gradient(135deg, #69b7ff 0%, #3f51b5 100%)',
                borderRadius: '50%',
                margin: '0 auto 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '64px',
                position: 'relative',
                boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
              }}>
                📧
                <div style={{
                  position: 'absolute',
                  bottom: '-8px',
                  right: '18px',
                  background: 'white',
                  borderRadius: '50%',
                  width: '46px',
                  height: '46px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                  fontSize: '26px'
                }}>🔒</div>
              </div>

              <Group justify="center" gap="md" mb="lg">
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#42a5f5',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '22px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>👤</div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#26c6da',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '22px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>💬</div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#66bb6a',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '22px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>🔑</div>
              </Group>

              <Text c="white" size="lg" fw={600} mb="xs">
                Recover Your Password
              </Text>
              <Text c="rgba(54, 38, 38, 0.85)" size="sm">
                We will send you a secure reset link
              </Text>
            </div>
          )}
        </Box>

        {/* Right side - Login form */}
        <Box flex={1} maw={500} w="100%" h="100%">
          <Paper shadow="xl" p="xl"  className="loginPaper" style={{ 
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }}>
          <LoadingOverlay visible={isLoading} />
          
          <Stack gap="lg">
            {/* Header */}
            <Box ta="center">
              {!showForgotPassword ? (
                <>
                  <Title order={2} size="h3" fw={700} c="black" mb="xs">
                    <span style={{color: '#2196f3'}}>Welcome </span>to Mediente Admin Dashboard 🚀
                  </Title>
                  <Text c="dimmed" size="sm" mt="sm" ta="end">
                    Sign in to your account
                  </Text>
                </>
              ) : (
                <>
                  <Title order={2} size="h3" fw={700} c="black" mb="xs">
                    Recover Your <span style={{color: '#2196f3'}}>password</span>
                  </Title>
                </>
              )}
            </Box>

          {/* Failed attempts warning / Blocked alert only for Login page */}
          {!showForgotPassword && (
            <>
              {failedAttempts > 0 && failedAttempts < 3 && (
                <Alert 
                  icon={<IconAlertCircle />} 
                  color="yellow" 
                  title="Login Attempt Warning"
                >
                  {failedAttempts} failed attempt(s). {3 - failedAttempts} attempt(s) remaining.
                </Alert>
              )}

              {isBlocked && (
                <Alert 
                  icon={<IconAlertCircle />} 
                  color="red" 
                  title="Account Temporarily Blocked"
                >
                  Too many failed attempts. Please reset your password.
                </Alert>
              )}
            </>
          )}

          {!showForgotPassword ? (
            /* Login Form */
            <form onSubmit={loginForm.onSubmit(handleLogin)}>
              <Stack gap="md">
               
                <TextInput radius="lg"
                  
                  placeholder="Enter your email"
                  leftSection={<Text size="sm">📧</Text>}
                  {...loginForm.getInputProps('email')}
                  disabled={isLoading}
                />

                <PasswordInput radius="lg"
                  
                  placeholder="Enter your password"
                  leftSection={<Text size="sm">🔒</Text>}
                  visibilityToggleIcon={({ reveal }) =>
                    reveal ? <IconEyeOff size={18} /> : <IconEye size={18} />
                  }
                  {...loginForm.getInputProps('password')}
                  disabled={isLoading}
                />
                {Object.keys(loginForm.errors).length > 0 && (
                  <Text c="red" fw={700}  size="sm">
                    Email or password is invalid please try again!
                  </Text>
                )}

                <Button radius="lg"
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
                    By continuing you agree to our{' '}
                    <Anchor size="sm">Terms & Conditions</Anchor>{' '}
                    and <Anchor size="sm">Privacy Policy</Anchor>
                  </Text>
                </Group>

                <Group justify="center" mt="md">
                  <Text size="sm" c="dimmed">
                    Unable to Log in?{' '}
                    <Anchor 
                      size="sm" 
                      onClick={() => setShowForgotPassword(true)}
                      style={{ cursor: 'pointer' }}
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
            <Stack gap="md" style={{
    height: "400px",
    width: "350px", // enlarge container
    padding: "1.5rem", 
    borderRadius: "8px"
  }}
  justify="space-between">
              <Group>
              <Text size="sm" c="dimmed" ta="center">
                Enter your email address and we'll send you a reset link
              </Text>
              <br/>
              <br/>
<Group justify="center">
              <TextInput radius="lg"
              size="sm" 
              style={{
                width: "300px", 
              

              }}
                label="Email Address"
                placeholder="Enter your email"
                leftSection={<Text size="sm">📧</Text>}
                {...resetForm.getInputProps('email')}
                disabled={isLoading}
              />

              
                
                <Button 
                  type="submit"
                  fullWidth
                  radius="lg"
                  size="md"
                  disabled={isLoading}
                  loading={isLoading}
                >
                  Send Reset Link
                </Button>
               
                </Group>
                </Group>
              
                <Text size="sm" c="dimmed" ta="center">
                  Unable to Log in?{' '}
                  <Anchor 
                    size="sm" 
                    onClick={() => setShowForgotPassword(true)}
                    style={{ cursor: 'pointer' }}
                  >
                    Reset Password
                  </Anchor>
                </Text>
              
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