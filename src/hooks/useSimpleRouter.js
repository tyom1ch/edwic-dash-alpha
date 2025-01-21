import { useState, useEffect } from 'react';

// Створимо свій простий хук для маршрутизації
const useSimpleRouter = (initialUrl = '/') => {
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  
  // Функція для зміни URL
  const navigate = (url) => {
    setCurrentUrl(url); // змінюємо поточний URL
    window.history.pushState({}, '', url); // змінюємо URL в адресному рядку браузера
  };

  // Створюємо searchParams, переконуючись, що він ніколи не буде undefined
  const [searchParams, setSearchParams] = useState(new URLSearchParams(window.location.search));

  useEffect(() => {
    // Оновлюємо searchParams і currentUrl при зміні URL
    const handleLocationChange = () => {
      setCurrentUrl(window.location.pathname); // Оновлюємо поточний шлях
      setSearchParams(new URLSearchParams(window.location.search)); // Оновлюємо параметри пошуку
    };

    // Додаємо слухача подій для зміни URL
    window.addEventListener('popstate', handleLocationChange);

    // Оновлюємо searchParams при початковій завантаженні
    handleLocationChange();

    // Очищаємо слухач подій при демонтажі компонента
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Створюємо об'єкт маршрутизатора (router)
  const router = {
    pathname: currentUrl, // поточний URL
    searchParams: searchParams, // передаємо searchParams
    navigate: navigate, // функція для зміни URL
  };

  return {
    pathname: router.pathname, // тепер повертаємо pathname окремо
    navigate,
    searchParams,
    router, // повертаємо router для подальшого використання
  };
};

export default useSimpleRouter;
