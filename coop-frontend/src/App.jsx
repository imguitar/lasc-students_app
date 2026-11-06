import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import './App.css';

function App() {
  return (
    <Router basename="/coop">
      <AppRoutes />
    </Router>
  );
}

export default App;
