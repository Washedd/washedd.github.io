(function () {
  const widget = document.querySelector(".github-widget");
  const listEl = document.getElementById("github-commits");
  const linkEl = document.querySelector(".github-widget-link");
  if (!widget || !listEl) return;

  const username = widget.dataset.githubUser;
  if (!username) return;

  if (linkEl) linkEl.href = "https://github.com/" + username;

  const MAX_COMMITS = 5;

  function formatDate(str) {
    const d = new Date(str);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return diffDays + " days ago";
    return d.toLocaleDateString();
  }

  function render(commits) {
    listEl.innerHTML = commits
      .slice(0, MAX_COMMITS)
      .map(
        (c) =>
          `<li class="github-commit-item">
            <a href="${c.url}" target="_blank" rel="noreferrer noopener" class="github-commit-link">
              <span class="github-commit-repo">${escapeHtml(c.repo)}</span>
              <span class="github-commit-message">${escapeHtml(c.message)}</span>
              <span class="github-commit-meta">${formatDate(c.date)}</span>
            </a>
          </li>`
      )
      .join("");
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function showError() {
    listEl.innerHTML =
      '<li class="github-commit-item github-widget-error">Could not load commits.</li>';
  }

  fetch("https://api.github.com/users/" + username + "/events/public")
    .then((r) => {
      if (!r.ok) throw new Error("GitHub API error");
      return r.json();
    })
    .then((events) => {
      const commits = [];
      for (const event of events) {
        if (event.type !== "PushEvent" || !event.payload.commits) continue;
        const repo = event.repo.name;
        for (const c of event.payload.commits) {
          commits.push({
            repo,
            message: c.message,
            sha: c.sha,
            url:
              "https://github.com/" +
              repo +
              "/commit/" +
              c.sha,
            date: event.created_at,
          });
        }
      }
      render(commits);
    })
    .catch(showError);
})();
