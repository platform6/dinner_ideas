import type { ReactNode } from 'react';
import { Box, Flex, HStack, IconButton, Text } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth/useAuth';
import { navItems, uiIcons } from '@/shared/components/icons';

interface LayoutProps {
  children: ReactNode;
}

/**
 * App shell: a bottom tab bar (phone-first) + the routed page content, per
 * `002-kitchen-table-theme`'s FR-3. Returns to a top bar at `md`+. Log out and
 * the store-config entry point live in the header, not the tab bar — the tab
 * bar is exactly `navItems` (4 routes), unchanged from the handoff's spec.
 */
export function Layout({ children }: LayoutProps) {
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <Box minH="100vh" pb={{ base: '70px', md: 0 }}>
      {/* Header: title + account/store-config actions. Present at every breakpoint —
          it's where "Not interested" (Catalog) and store-config links also live,
          added by later stories in this bolt/unit. */}
      <Flex
        as="header"
        align="center"
        justify="space-between"
        px={{ base: 4, md: 6 }}
        py={3}
        borderBottomWidth="1px"
        borderColor="line.subtle"
      >
        <Text textStyle="cardTitle">Dinner Ideas</Text>
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

      <Box as="main" p={{ base: 4, md: 6 }}>
        {children}
      </Box>

      {/* Bottom tab bar: phone-first nav, per navItems (4 routes). Returns to a
          top-of-page position conceptually at md+ by simply hiding here — at that
          breakpoint the header above is the only nav a wider screen needs. */}
      <Flex
        as="nav"
        display={{ base: 'flex', md: 'none' }}
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
