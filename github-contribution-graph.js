(function () {
  const container = document.querySelector(".github-contribution-graph");
  const gridEl = document.getElementById("github-contribution-grid");
  const totalEl = document.getElementById("github-contribution-total");
  if (!container || !gridEl) return;

  const username = container.dataset.githubUser;
  if (!username) return;

  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  function getLevel(count) {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 9) return 3;
    return 4;
  }

  function render(calendar) {
    if (!calendar || !calendar.weeks) return;

    if (totalEl) totalEl.textContent = calendar.totalContributions;

    const weeks = calendar.weeks;
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const rows = 7;
    const cols = weeks.length;

    const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    const titles = Array.from({ length: rows }, () => Array(cols).fill(null));

    weeks.forEach((week, colIdx) => {
      (week.contributionDays || []).forEach((day) => {
        const d = new Date(day.date + "T12:00:00Z");
        const jsDay = d.getUTCDay();
        const rowIdx = (jsDay + 6) % 7;
        grid[rowIdx][colIdx] = day.contributionCount;
        titles[rowIdx][colIdx] = day.date + ": " + day.contributionCount + " contribution(s)";
      });
    });

    const monthLabels = [];
    let lastMonth = -1;
    for (let c = 0; c < cols; c++) {
      const firstDayInWeek = weeks[c].contributionDays && weeks[c].contributionDays[0];
      const month = firstDayInWeek
        ? new Date(firstDayInWeek.date + "T12:00:00Z").getUTCMonth()
        : lastMonth;
      if (month !== lastMonth) {
        const label = firstDayInWeek
          ? new Date(firstDayInWeek.date + "T12:00:00Z").toLocaleDateString("en-US", {
              month: "short",
            })
          : "";
        monthLabels.push({ col: c, label });
        lastMonth = month;
      }
    }

    const cellSize = 10;
    const labelWidth = 28;
    const gap = 2;
    gridEl.style.display = "grid";
    gridEl.style.gridTemplateColumns = labelWidth + "px repeat(" + cols + ", " + cellSize + "px)";
    gridEl.style.gridTemplateRows = "16px repeat(7, " + cellSize + "px)";
    gridEl.style.gap = gap + "px";
    gridEl.style.minWidth = (labelWidth + cols * cellSize + (cols - 1) * gap) + "px";

    let html = "";
    monthLabels.forEach((m) => {
      html +=
        '<span class="github-contribution-month" style="grid-column: ' +
        (m.col + 2) +
        '; grid-row: 1">' +
        m.label +
        "</span>";
    });
    dayLabels.forEach((label, i) => {
      html +=
        '<span class="github-contribution-day-label" style="grid-column: 1; grid-row: ' +
        (i + 2) +
        '">' +
        label +
        "</span>";
    });
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const count = grid[row][col];
        const level = getLevel(count);
        const title = titles[row][col] || "No contributions";
        html +=
          '<span class="github-contribution-cell level-' +
          level +
          '" style="grid-column: ' +
          (col + 2) +
          "; grid-row: " +
          (row + 2) +
          '" title="' +
          title.replace(/"/g, "&quot;") +
          '" aria-label="' +
          title.replace(/"/g, "&quot;") +
          '"></span>';
      }
    }

    gridEl.innerHTML = html;
  }

  function showError(msg) {
    if (totalEl) totalEl.textContent = "—";
    gridEl.innerHTML =
      '<p class="github-contribution-error">' +
      (msg || "Could not load contribution graph.") +
      "</p>";
  }

  function buildGridFromCounts(dayCounts, total) {
    if (totalEl) totalEl.textContent = total;
    const sortedDays = Object.keys(dayCounts).sort();
    if (sortedDays.length === 0) {
      gridEl.innerHTML = '<p class="github-contribution-error">No public activity in the last 90 days.</p>';
      return;
    }
    const first = sortedDays[0];
    const last = sortedDays[sortedDays.length - 1];
    const start = new Date(first + "T12:00:00Z");
    const end = new Date(last + "T12:00:00Z");
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const daysByWeek = {};
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const dayOfWeek = (d.getUTCDay() + 6) % 7;
      const weekStart = new Date(d);
      weekStart.setUTCDate(weekStart.getUTCDate() - dayOfWeek);
      const key = weekStart.toISOString().slice(0, 10);
      if (!daysByWeek[key]) daysByWeek[key] = Array(7).fill(0);
      daysByWeek[key][dayOfWeek] = dayCounts[dateStr] || 0;
    }
    const weeks = Object.keys(daysByWeek).sort();
    const cols = weeks.length;
    const cellSize = 10;
    const labelWidth = 28;
    const gap = 2;
    gridEl.style.display = "grid";
    gridEl.style.gridTemplateColumns = labelWidth + "px repeat(" + cols + ", " + cellSize + "px)";
    gridEl.style.gridTemplateRows = "16px repeat(7, " + cellSize + "px)";
    gridEl.style.gap = gap + "px";
    gridEl.style.minWidth = (labelWidth + cols * cellSize + (cols - 1) * gap) + "px";

    const monthLabels = [];
    let lastMonth = -1;
    weeks.forEach((weekStart, i) => {
      const month = new Date(weekStart + "T12:00:00Z").getUTCMonth();
      if (month !== lastMonth) {
        const label = new Date(weekStart + "T12:00:00Z").toLocaleDateString("en-US", { month: "short" });
        monthLabels.push({ col: i, label });
        lastMonth = month;
      }
    });

    let html = "";
    monthLabels.forEach(function (m) {
      html += '<span class="github-contribution-month" style="grid-column: ' + (m.col + 2) + '; grid-row: 1">' + m.label + "</span>";
    });
    dayLabels.forEach(function (label, i) {
      html += '<span class="github-contribution-day-label" style="grid-column: 1; grid-row: ' + (i + 2) + '">' + label + "</span>";
    });
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < cols; col++) {
        const count = (daysByWeek[weeks[col]] || [0, 0, 0, 0, 0, 0, 0])[row];
        const level = getLevel(count);
        const d = new Date(weeks[col]);
        d.setUTCDate(d.getUTCDate() + row);
        const dateStr = d.toISOString().slice(0, 10);
        const title = dateStr + ": " + count + " contribution(s)";
        html +=
          '<span class="github-contribution-cell level-' +
          level +
          '" style="grid-column: ' + (col + 2) + "; grid-row: " + (row + 2) +
          '" title="' + title.replace(/"/g, "&quot;") + '"></span>';
      }
    }
    gridEl.innerHTML = html;
  }

  function fetchPublicEventsFallback() {
    fetch("https://api.github.com/users/" + username + "/events/public?per_page=100")
      .then(function (r) {
        if (!r.ok) throw new Error("Events API error");
        return r.json();
      })
      .then(function (events) {
        const dayCounts = {};
        let total = 0;
        const now = Date.now();
        const cutoff = now - 90 * 24 * 60 * 60 * 1000;
        events.forEach(function (event) {
          const date = event.created_at && event.created_at.slice(0, 10);
          if (!date) return;
          const t = new Date(date + "T12:00:00Z").getTime();
          if (t < cutoff) return;
          const n = event.type === "PushEvent" && event.payload.commits
            ? event.payload.commits.length
            : 1;
          dayCounts[date] = (dayCounts[date] || 0) + n;
          total += n;
        });
        buildGridFromCounts(dayCounts, total);
      })
      .catch(function () {
        showError();
      });
  }

  fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: {
        login: username,
        from: from + "T00:00:00Z",
        to: to + "T23:59:59Z",
      },
    }),
  })
    .then(function (r) {
      if (r.status === 401) {
        fetchPublicEventsFallback();
        return null;
      }
      return r.json();
    })
    .then(function (data) {
      if (!data) return;
      if (data.errors && data.errors.length) {
        showError();
        return;
      }
      const calendar = data.data && data.data.user && data.data.user.contributionsCollection && data.data.user.contributionsCollection.contributionCalendar;
      if (!calendar) {
        showError();
        return;
      }
      render(calendar);
    })
    .catch(function () {
      showError();
    });
})();
