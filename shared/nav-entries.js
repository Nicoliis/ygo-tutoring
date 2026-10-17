/* Link helpers kept for the profile switcher and the sidebar; the pages themselves live in areas.js. */
function hrefForSlug(slug) {
  return slug ? hrefFromRoot(`${slug}/index.html`) : hrefFromRoot("index.html");
}
