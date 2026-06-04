'use client';

import { useState } from 'react';
import {
  Box, Container, Heading, Text, Button, VStack, HStack,
  SimpleGrid, Badge, Link,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const ThreeScene = dynamic(() => import('@/components/ThreeScene'), { ssr: false });
const BabylonScene = dynamic(() => import('@/components/BabylonScene'), { ssr: false });

const MotionBox = motion.create(Box);
const MotionHeading = motion.create(Heading);
const MotionText = motion.create(Text);

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const slideUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const PINK = '#EDC1CB';
const PINK_DIM = '#b8909a';
const BORDER = 'rgba(237,193,203,0.15)';

const techStack = [
  'Next.js', 'TypeScript', 'React', 'Chakra UI', 'Framer Motion',
  'Three.js', 'Babylon.js', 'GSAP', 'Web Audio API', 'Canvas 2D',
  'Node.js', 'Vite', 'Git', 'GitHub Actions',
];

const projects = [
  {
    title: 'rd.website',
    desc: 'Interactive brand studio site with GSAP, Web Audio, canvas particles.',
    tags: ['GSAP', 'Canvas', 'Web Audio', 'Vite'],
    link: 'https://github.com/Shyboy0499/rd.website',
  },
  {
    title: 'Portfolio Site',
    desc: 'This site — built with Next.js, Chakra UI, Framer Motion, Three.js, Babylon.js.',
    tags: ['Next.js', 'Chakra UI', 'Three.js', 'Babylon.js'],
    link: 'https://github.com/Shyboy0499/Shyboy0499.github.io',
  },
];

export default function HomePage() {
  const [scene, setScene] = useState<'three' | 'babylon'>('three');

  return (
    <Box as="main" minH="100vh">
      <Container maxW="4xl" py={{ base: 8, md: 16 }}>
        <MotionBox variants={fadeIn} initial="hidden" animate="show">
          {/* Hero */}
          <VStack gap={4} textAlign="center" mb={12}>
            <MotionBox
              variants={slideUp}
              w="80px" h="80px" borderRadius="full"
              bg={`linear-gradient(135deg, ${PINK}, ${PINK_DIM})`}
              display="flex" alignItems="center" justifyContent="center"
              fontSize="2xl" fontWeight="bold" color="black"
            >
              BC
            </MotionBox>
            <MotionHeading variants={slideUp} as="h1" fontSize="2.5rem" fontWeight={700} letterSpacing="-0.02em">
              Bro Code
            </MotionHeading>
            <MotionText variants={slideUp} color={PINK} fontSize="sm" letterSpacing="0.15em" textTransform="uppercase">
              Full-Stack Developer &amp; Creative Technologist
            </MotionText>
            <MotionText variants={slideUp} color="gray.400" maxW="lg" fontSize="md" lineHeight="1.7">
              Building immersive web experiences with modern JavaScript, GSAP, Three.js, Babylon.js, and creative coding.
            </MotionText>
            <MotionBox variants={slideUp}>
              <HStack gap={3} pt={2}>
                <Link href="https://github.com/Shyboy0499" target="_blank">
                  <Button variant="outline" borderColor={PINK} color={PINK} _hover={{ bg: 'rgba(237,193,203,0.1)' }} size="sm">
                    GitHub
                  </Button>
                </Link>
                <Link href="https://github.com/Shyboy0499/rd.website" target="_blank">
                  <Button bg={PINK} color="black" fontWeight={600} _hover={{ bg: PINK_DIM }} size="sm">
                    rd.website
                  </Button>
                </Link>
                <Link href="mailto:hello@unseen.co">
                  <Button variant="outline" borderColor={PINK} color={PINK} _hover={{ bg: 'rgba(237,193,203,0.1)' }} size="sm">
                    Contact
                  </Button>
                </Link>
              </HStack>
            </MotionBox>
          </VStack>

          {/* 3D Scene Toggle */}
          <MotionBox variants={slideUp} mb={8}>
            <HStack justify="center" gap={2} mb={4}>
              <Button
                size="xs"
                variant={scene === 'three' ? 'solid' : 'outline'}
                bg={scene === 'three' ? PINK : 'transparent'}
                color={scene === 'three' ? 'black' : PINK}
                borderColor={PINK}
                onClick={() => setScene('three')}
              >
                Three.js Torus
              </Button>
              <Button
                size="xs"
                variant={scene === 'babylon' ? 'solid' : 'outline'}
                bg={scene === 'babylon' ? PINK : 'transparent'}
                color={scene === 'babylon' ? 'black' : PINK}
                borderColor={PINK}
                onClick={() => setScene('babylon')}
              >
                Babylon.js Sphere
              </Button>
            </HStack>
            <Box borderRadius="xl" overflow="hidden" border="1px" borderColor={BORDER}>
              <AnimatePresence mode="wait">
                <MotionBox
                  key={scene}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.35 }}
                >
                  {scene === 'three' ? <ThreeScene /> : <BabylonScene />}
                </MotionBox>
              </AnimatePresence>
            </Box>
          </MotionBox>

          {/* Skills */}
          <MotionBox variants={slideUp} mb={10}>
            <Heading as="h2" fontSize="lg" mb={4} color={PINK} letterSpacing="0.05em">
              Tech Stack
            </Heading>
            <HStack flexWrap="wrap" gap={2}>
              {techStack.map((tech) => (
                <Badge
                  key={tech}
                  px={3} py={1}
                  borderRadius="full"
                  bg="rgba(237,193,203,0.08)"
                  color={PINK}
                  border="1px solid rgba(237,193,203,0.15)"
                  fontSize="xs"
                  fontWeight={500}
                >
                  {tech}
                </Badge>
              ))}
            </HStack>
          </MotionBox>

          {/* Projects */}
          <MotionBox variants={slideUp}>
            <Heading as="h2" fontSize="lg" mb={4} color={PINK} letterSpacing="0.05em">
              Featured Projects
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {projects.map((project) => (
                <Link key={project.title} href={project.link} target="_blank" _hover={{ textDecoration: 'none' }}>
                  <MotionBox
                    whileHover={{ scale: 1.02, borderColor: 'rgba(237,193,203,0.4)' }}
                    p={5} borderRadius="lg" border="1px" borderColor="rgba(255,255,255,0.06)"
                    bg="rgba(255,255,255,0.02)"
                  >
                    <Heading as="h3" fontSize="md" mb={1} color="white">{project.title}</Heading>
                    <Text fontSize="sm" color="gray.400" mb={3}>{project.desc}</Text>
                    <HStack flexWrap="wrap" gap={1}>
                      {project.tags.map((tag) => (
                        <Badge key={tag} fontSize="xs" bg="rgba(237,193,203,0.1)" color={PINK} borderRadius="md">
                          {tag}
                        </Badge>
                      ))}
                    </HStack>
                  </MotionBox>
                </Link>
              ))}
            </SimpleGrid>
          </MotionBox>

          {/* Footer */}
          <MotionBox variants={slideUp} as="footer" textAlign="center" mt={16} py={6} borderTop="1px" borderColor="rgba(255,255,255,0.06)">
            <Text fontSize="xs" color="gray.600">
              &copy; 2026 Bro Code &middot; Next.js + Chakra UI + Framer Motion + Three.js + Babylon.js
            </Text>
          </MotionBox>
        </MotionBox>
      </Container>
    </Box>
  );
}
