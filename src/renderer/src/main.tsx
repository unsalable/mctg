import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/main.css'

// Electron dışında (tarayıcı önizlemesi) preload köprüsü olmadığından sahte köprü kurulur.
if (import.meta.env.DEV && !window.launcher) {
  const { installBrowserMock } = await import('./dev/browserMock')
  installBrowserMock()
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
