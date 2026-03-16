(function () {
  const widget = document.querySelector(".github-widget");
  const listEl = document.getElementById("github-commits");
  const linkEl = document.querySelector(".github-widget-link");
  const commits7dEl = document.getElementById("github-commits-7d");
  const commits30dEl = document.getElementById("github-commits-30d");
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

  function updateCommitRates(count7d, count30d) {
    if (commits7dEl) commits7dEl.textContent = String(count7d);
    if (commits30dEl) commits30dEl.textContent = String(count30d);
  }

  function showError() {
    listEl.innerHTML =
      '<li class="github-commit-item github-widget-error">Could not load commits.</li>';
    updateCommitRates("—", "—");
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
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const count7d = commits.filter((c) => new Date(c.date).getTime() >= sevenDaysAgo).length;
      const count30d = commits.filter((c) => new Date(c.date).getTime() >= thirtyDaysAgo).length;
      updateCommitRates(count7d, count30d);
      render(commits);
    })
    .catch(showError);
})();
