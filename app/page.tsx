import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="mb-8 text-4xl font-bold">InnovateEPAM Portal</h1>
      <Button size="lg">Submit an Idea</Button>
    </main>
  )
}
