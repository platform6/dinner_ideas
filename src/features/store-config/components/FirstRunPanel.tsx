import { Box, Button, Center, Stack, Text } from '@chakra-ui/react';

import { uiIcons } from '@/shared/components/icons';

/**
 * No stops configured (story 005). A normal starting point, not an onboarding moment and not an
 * error — so no warning styling anywhere, and copy that gives the user a way in rather than
 * instructions.
 *
 * The closing line matters more than the rest: it tells her nothing is broken while the path is
 * empty. A household that never configured the old page lands here after the cutover seeds
 * their empty store (bolt 051).
 */
export function FirstRunPanel({ onAddFirstStop }: { onAddFirstStop: () => void }) {
  return (
    <Box
      bg="paper.subtle"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="line.DEFAULT"
      borderRadius="card"
      px={5}
      py={6}
    >
      <Stack gap={3} align="flex-start">
        <Center w="40px" h="40px" borderRadius="control" bg="brand.100" color="brand.500" aria-hidden>
          <uiIcons.storeConfig size={20} strokeWidth={2} />
        </Center>

        <Text fontFamily="heading" fontWeight={500} fontSize="lg" color="ink.900">
          Start where you start
        </Text>

        <Text textStyle="faint" color="ink.700">
          Add the first place you walk into — usually produce or the bakery. Add the rest as you remember
          them; order can change any time.
        </Text>

        <Button onClick={onAddFirstStop}>Add the first stop</Button>

        <Text textStyle="meta" color="ink.400">
          Until then, lists stay in alphabetical order.
        </Text>
      </Stack>
    </Box>
  );
}
