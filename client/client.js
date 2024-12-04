// Force redirect to /login if on the root page
if (window.location.pathname === '/') {
    window.location.href = '/login';
}

// Verify token
const token = localStorage.getItem('token');

if (!token) {
    // If no token, ensure we're on the login page
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
} else {
    // If we have a token, ensure we're not on the login page
    if (window.location.pathname === '/login') {
        window.location.href = '/';  // Redirect to the home page (or wherever appropriate)
    }
}



if (location.host.includes('localhost')) {
  // Load livereload script if we are on localhost
  document.write(
    '<script src="http://' +
      (location.host || 'localhost').split(':')[0] +
      ':35729/livereload.js?snipver=1"></' +
      'script>'
  )
}
/*
// Verify token
const token = localStorage.getItem('token');

if (!token) {
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
} else {
    if (window.location.pathname === '/login') {
        window.location.href = '/';
    }
}

console.log('This is a Test')
*/