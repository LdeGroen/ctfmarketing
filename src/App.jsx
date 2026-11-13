import React, { useEffect, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { FormPage } from './components/FormPage';
import { CheckPage } from './components/CheckPage';

// Path-based routing:
//   /                            → landing
//   /inzending/:token            → formulier (status draft)
//   /check/:token                → check-pagina (status naar_maker)
function getRoute() {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    const parts = path.split('/');
    if ((parts[0] === 'inzending' || parts[0] === 'submission') && parts[1]) {
        return { name: 'form', token: parts[1] };
    }
    if (parts[0] === 'check' && parts[1]) {
        return { name: 'check', token: parts[1] };
    }
    return { name: 'landing' };
}

export default function App() {
    const [route, setRoute] = useState(getRoute());

    useEffect(() => {
        const onPop = () => setRoute(getRoute());
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    const navigateToForm = (token) => {
        window.history.pushState({}, '', `/inzending/${token}`);
        setRoute({ name: 'form', token });
    };

    const navigateToLanding = () => {
        window.history.pushState({}, '', '/');
        setRoute({ name: 'landing' });
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            {route.name === 'landing' && <LandingPage onStart={navigateToForm} />}
            {route.name === 'form' && <FormPage token={route.token} onBack={navigateToLanding} />}
            {route.name === 'check' && <CheckPage token={route.token} />}
        </div>
    );
}
