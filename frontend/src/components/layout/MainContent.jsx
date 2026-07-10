import { useLocation } from 'react-router-dom';
import PageMotion from '../motion/PageMotion';

const MainContent = ({ children }) => {
  const location = useLocation();

  return (
    <main className="app-main">
      <PageMotion key={location.pathname} className="page-transition">
        {children}
      </PageMotion>
    </main>
  );
};

export default MainContent;