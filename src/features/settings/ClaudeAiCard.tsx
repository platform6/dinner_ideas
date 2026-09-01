import { useState } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Divider,
  Heading,
  HStack,
  Input,
  Select,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { callClaude, ClaudeError, type ClaudeErrorCode } from '@/features/ai/api';
import { clearHouseholdKey, fetchAiConfig, setHouseholdKey, updateAiConfig } from '@/features/settings/api';

const ERROR_MESSAGE: Record<ClaudeErrorCode, string> = {
  no_session: 'Your session has expired — sign in again.',
  no_household: "Your account isn't attached to a household.",
  no_api_key: 'No Claude API key set for this household — an owner can add one below.',
  rate_limited: 'Daily limit reached — try again tomorrow.',
  bad_request: "Something's misconfigured (bad request).",
  upstream_error: 'Claude is unavailable right now.',
  timeout: 'Claude took too long to respond.',
};

type TestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; model: string; latencyMs: number }
  | { status: 'error'; message: string };

/**
 * The one card on `/settings` for now (intent 007). "Test connection" is visible to any
 * household member; the key / model / daily-limit controls are owner-only — and the server
 * (RLS + `security definer` owner checks) is the real gate, this is just the UI gate.
 */
export function ClaudeAiCard() {
  const { role } = useAuth();
  const isOwner = role === 'owner';
  const queryClient = useQueryClient();

  const config = useQuery({ queryKey: ['ai-config'], queryFn: fetchAiConfig });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['ai-config'] });

  const [test, setTest] = useState<TestState>({ status: 'idle' });
  const [keyInput, setKeyInput] = useState('');
  // null until the owner edits the field; before that it tracks the loaded config so the
  // input shows the saved limit once the query resolves (not a mount-time fallback).
  const [limitEdit, setLimitEdit] = useState<string | null>(null);
  const limitValue = limitEdit ?? (config.data ? String(config.data.dailyCallLimit) : '');

  async function runTest() {
    setTest({ status: 'loading' });
    try {
      const r = await callClaude({
        feature: 'connection_test',
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 16,
      });
      setTest({ status: 'ok', model: r.model, latencyMs: r.latencyMs });
    } catch (e) {
      const code: ClaudeErrorCode = e instanceof ClaudeError ? e.code : 'upstream_error';
      setTest({ status: 'error', message: ERROR_MESSAGE[code] });
    }
  }

  const saveKey = useMutation({
    mutationFn: () => setHouseholdKey(keyInput),
    onSuccess: () => {
      setKeyInput('');
      invalidate();
    },
  });
  const clearKey = useMutation({ mutationFn: clearHouseholdKey, onSuccess: invalidate });
  const saveModel = useMutation({
    mutationFn: (value: string) => updateAiConfig({ model_override: value === '' ? null : (value as never) }),
    onSuccess: invalidate,
  });
  const saveLimit = useMutation({
    mutationFn: (n: number) => updateAiConfig({ daily_call_limit: n }),
    onSuccess: invalidate,
  });

  return (
    <Box
      borderWidth="1px"
      borderColor="line.subtle"
      borderRadius="field"
      bg="paper.base"
      p={{ base: 5, md: 6 }}
    >
      <Heading as="h2" size="sm" mb={1}>
        Claude / AI
      </Heading>
      <Text fontSize="sm" color="ink.300" mb={4}>
        AI features use Anthropic&rsquo;s Claude. Each household brings its own API key.
      </Text>

      <Stack spacing={2}>
        <HStack>
          <Button
            size="sm"
            onClick={() => void runTest()}
            isLoading={test.status === 'loading'}
            loadingText="Testing…"
          >
            Test connection
          </Button>
          {test.status === 'ok' && (
            <Text fontSize="sm" color="brand.500">
              ✓ Connected — {test.model}, {test.latencyMs} ms
            </Text>
          )}
        </HStack>
        {test.status === 'error' && (
          <Alert status="warning" borderRadius="field" fontSize="sm">
            <AlertIcon />
            {test.message}
          </Alert>
        )}
      </Stack>

      {config.isError && (
        <Alert status="error" borderRadius="field" fontSize="sm" mt={4}>
          <AlertIcon />
          Couldn&rsquo;t load AI settings.
        </Alert>
      )}

      {isOwner ? (
        <>
          <Divider my={5} />
          <Stack spacing={5}>
            <Box>
              <HStack justify="space-between" mb={2} flexWrap="wrap" gap={2}>
                <Text fontSize="sm" fontWeight={600}>
                  Anthropic API key
                </Text>
                <Badge colorScheme={config.data?.keySet ? 'green' : 'gray'}>
                  {config.data?.keySet ? 'Key set ✓' : 'No key set — Claude is off for this household'}
                </Badge>
              </HStack>
              <HStack>
                <Input
                  type="password"
                  size="sm"
                  autoComplete="off"
                  placeholder="sk-ant-…"
                  aria-label="Anthropic API key"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={() => saveKey.mutate()}
                  isDisabled={keyInput.trim().length === 0}
                  isLoading={saveKey.isPending}
                >
                  Save key
                </Button>
                {config.data?.keySet && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => clearKey.mutate()}
                    isLoading={clearKey.isPending}
                  >
                    Clear key
                  </Button>
                )}
              </HStack>
              {(saveKey.isError || clearKey.isError) && (
                <Text fontSize="xs" color="heart.500" mt={1}>
                  Couldn&rsquo;t update the key.
                </Text>
              )}
            </Box>

            {/* Model + limit are bound to the loaded config — render them only once it's in. */}
            {config.isSuccess && (
              <>
                <Box>
                  <Text fontSize="sm" fontWeight={600} mb={2}>
                    Model
                  </Text>
                  <Select
                    size="sm"
                    maxW="260px"
                    aria-label="Model"
                    value={config.data.modelOverride ?? ''}
                    onChange={(e) => saveModel.mutate(e.target.value)}
                  >
                    <option value="">Default (Sonnet 5)</option>
                    <option value="claude-sonnet-5">claude-sonnet-5</option>
                    <option value="claude-haiku-4-5">claude-haiku-4-5</option>
                    <option value="claude-opus-5">claude-opus-5</option>
                  </Select>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight={600} mb={2}>
                    Daily call limit
                  </Text>
                  <Input
                    type="number"
                    size="sm"
                    maxW="120px"
                    min={0}
                    aria-label="Daily call limit"
                    value={limitValue}
                    onChange={(e) => setLimitEdit(e.target.value)}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isInteger(n) && n >= 0) saveLimit.mutate(n);
                    }}
                  />
                </Box>
              </>
            )}
          </Stack>
        </>
      ) : (
        <Text fontSize="sm" color="ink.300" mt={4}>
          Ask a household owner to add a Claude API key.
        </Text>
      )}
    </Box>
  );
}
