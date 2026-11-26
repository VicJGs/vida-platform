import { beforeAll } from 'vitest'
import { setProjectAnnotations } from '@storybook/react-vite'
import preview from './preview'

// DSG-22 (LIF-866): applies preview.tsx (the UIProvider decorator and its initial globals) once, so every story
// composed in src/stories.test.tsx renders exactly as it does in Storybook.
const annotations = setProjectAnnotations(preview)

beforeAll(annotations.beforeAll)
