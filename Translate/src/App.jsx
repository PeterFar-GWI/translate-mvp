import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import TranslationTrainer from "./TranslationTrainer";

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <TranslationTrainer />;
    </>
  )
}

export default App
