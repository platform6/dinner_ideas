import type { ReactNode } from 'react';
import { Box, Flex, HStack, IconButton, Text, useBreakpointValue } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth/useAuth';
import { navItems, uiIcons } from '@/shared/components/icons';

/**
 * App shell. One breakpoint — `md` (768px):
 *   below md — header + fixed bottom tab bar (phone-first, per `002-kitchen-table-theme` FR-3)
 *   md and up — a 240px persistent left rail, no header (per `005-desktop-layout` FR-1)
 *
 * Exactly one nav is rendered at a time (via `useBreakpointValue`), so there is one link per
 * route in the DOM. The rail and the tab bar both read `navItems`, so they can't drift. Store
 * setup + Log out live in the header below md and the rail foot at md+.
 *
 * Content width is capped here, not per page: 720px normally, 1080px for `WIDE_ROUTES`
 * (Catalog, Store setup). Derived from the pathname so `App.tsx` (`<Layout><Routes/></Layout>`)
 * needs no restructure; a page can still override with the `wide` prop.
 */

const RAIL_WIDTH = '240px';
const TAB_BAR_HEIGHT = '70px';
const WIDE_ROUTES = new Set(['/', '/store-config']);

interface LayoutProps {
  children: ReactNode;
  /** Overrides the WIDE_ROUTES lookup — 1080px cap instead of 720px. */
  wide?: boolean;
}

function RailLink({ to, label, Icon }: { to: string; label: string; Icon: typeof uiIcons.logo }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Flex
      as={RouterLink}
      to={to}
      aria-current={isActive ? 'page' : undefined}
      align="center"
      gap={3}
      h="44px"
      px={3.5}
      borderRadius="chip"
      bg={isActive ? 'brand.50' : 'transparent'}
      color={isActive ? 'brand.500' : 'ink.300'}
      fontSize="0.8125rem"
      fontWeight={isActive ? 600 : 500}
      transition="background 0.12s ease, color 0.12s ease"
      _hover={{
        bg: isActive ? 'brand.50' : 'paper.subtle',
        color: isActive ? 'brand.500' : 'ink.700',
      }}
    >
      <Icon size={17} strokeWidth={isActive ? 2 : 1.8} />
      <Text as="span">{label}</Text>
    </Flex>
  );
}

export function Layout({ children, wide }: LayoutProps) {
  const { signOut } = useAuth();
  const location = useLocation();
  const view = useBreakpointValue({ base: 'mobile', md: 'desktop' }, { ssr: false }) ?? 'mobile';
  const isWide = wide ?? WIDE_ROUTES.has(location.pathname);

  const main = (
    <Box as="main" px={{ base: 4, md: 8 }} py={{ base: 4, md: 10 }}>
      <Box maxW={isWide ? '1080px' : '720px'} mx="auto">
        {children}
      </Box>
    </Box>
  );

  if (view === 'desktop') {
    return (
      <Flex minH="100vh" align="stretch">
        <Flex
          as="nav"
          aria-label="Main"
          direction="column"
          w={RAIL_WIDTH}
          flexShrink={0}
          position="sticky"
          top={0}
          alignSelf="flex-start"
          h="100vh"
          px={4}
          py={6}
          borderRightWidth="1px"
          borderColor="line.subtle"
          bg="paper.base"
        >
          <Text fontFamily="heading" fontSize="0.9375rem" color="ink.900" px={3.5} mb={5}>
            Dinner Ideas
          </Text>

          <Flex direction="column" gap={1}>
            {navItems.map((item) => (
              <RailLink key={item.to} to={item.to} label={item.label} Icon={item.icon} />
            ))}
          </Flex>

          <Box flex={1} />

          <Flex direction="column" gap={1} pt={4} borderTopWidth="1px" borderColor="line.subtle">
            <RailLink to="/store-config" label="Store setup" Icon={uiIcons.storeConfig} />
            <Flex
              as="button"
              type="button"
              onClick={() => void signOut()}
              align="center"
              gap={3}
              h="40px"
              px={3.5}
              borderRadius="chip"
              color="ink.300"
              fontSize="0.78125rem"
              fontWeight={500}
              _hover={{ bg: 'paper.subtle', color: 'ink.700' }}
            >
              <uiIcons.logOut size={15} strokeWidth={1.8} />
              <Text as="span">Log out</Text>
            </Flex>
          </Flex>
        </Flex>

        <Box flex={1} minW={0}>
          {main}
        </Box>
      </Flex>
    );
  }

  return (
    <Box minH="100vh" pb={TAB_BAR_HEIGHT}>
      <Flex
        as="header"
        align="center"
        justify="space-between"
        px={4}
        py={3}
        borderBottomWidth="1px"
        borderColor="line.subtle"
      >
        <Text fontFamily="heading" fontSize="0.9375rem" color="ink.700">
          Dinner Ideas
        </Text>
        <HStack gap={1}>
          <IconButton
            as={RouterLink}
            to="/store-config"
            aria-label="Store setup"
            icon={<uiIcons.storeConfig size={18} strokeWidth={2} />}
            variant="ghost"
            size="sm"
          />
          <IconButton
            aria-label="Log out"
            icon={<uiIcons.logOut size={18} strokeWidth={2} />}
            variant="ghost"
            size="sm"
            onClick={() => void signOut()}
          />
        </HStack>
      </Flex>

      {main}

      <Flex
        as="nav"
        aria-label="Main"
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        justify="space-around"
        px={3}
        pt="10px"
        pb="30px"
        borderTopWidth="1px"
        borderColor="line.subtle"
        bg="paper.base"
        zIndex={10}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Flex
              key={item.to}
              as={RouterLink}
              to={item.to}
              aria-current={isActive ? 'page' : undefined}
              direction="column"
              align="center"
              gap={1}
              color={isActive ? 'brand.500' : 'ink.300'}
              minW="44px"
              minH="44px"
              justify="center"
            >
              <Icon size={21} strokeWidth={isActive ? 2 : 1.8} />
              <Text fontSize="10.5px" fontWeight={isActive ? 600 : 500}>
                {item.label}
              </Text>
            </Flex>
          );
        })}
      </Flex>
    </Box>
  );
}
