import { useState, type FormEvent } from 'react';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
} from '@chakra-ui/react';

import { useAuth } from '@/features/auth/useAuth';

export function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError('Couldn’t log in. Check your email and password and try again.');
      }
    } catch {
      // signIn only resolves with { error } for auth failures; this catches everything
      // else (e.g. a network failure), which would otherwise leave no error shown at all.
      setError('Couldn’t log in. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box maxW="sm" mx="auto" mt={{ base: 12, md: 24 }} px={4}>
      <Heading size="lg" mb={6} textAlign="center">
        Dinner Ideas
      </Heading>
      <Box as="form" onSubmit={handleSubmit}>
        <Stack gap={4}>
          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}
          <FormControl isRequired>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </FormControl>
          <Button type="submit" colorScheme="teal" isLoading={isSubmitting}>
            Log in
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
