import './styles.css'
export const metadata = { title: 'Prüfwerk Online', description: 'UVV Prüfmanagement' }
export default function RootLayout({ children }) {
  return <html lang="de"><body>{children}</body></html>
}
