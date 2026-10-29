const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadPage, isHidden } = require("./helpers");

// Types a task, picks a priority and submits the form. Returns true if the page would have reloaded.
function addTask(page, text, priority = "medium") {
  page.$("#task-input").value = text;
  page.choose("#priority-select", priority);
  return page.submit("#task-form");
}

const items = (page) => page.$$("#task-list li");
const itemText = (li) => li.querySelector(".text")?.textContent.trim();
const leftCount = (page) => page.$("#left").textContent.trim();
const filter = (page, name) => page.click(`#filters [data-filter="${name}"]`);

// ---------- Step 1: add a task ----------

test("Step 1: submitting the form adds a task to the list without reloading the page", async () => {
  const page = await loadPage();
  const reloaded = addTask(page, "Buy milk");
  assert.equal(reloaded, false, "the page should not reload - call event.preventDefault() in the submit listener");
  assert.equal(items(page).length, 1, "after adding one task the list should have one li");
});

test("Step 1: a task li has a span.text and a button.delete with x", async () => {
  const page = await loadPage();
  addTask(page, "Buy milk");
  const li = items(page)[0];
  const span = li.querySelector("span.text");
  const btn = li.querySelector("button.delete");
  assert.ok(span, "the li should contain <span class=\"text\">");
  assert.equal(span.textContent.trim(), "Buy milk", "the span should contain the task text");
  assert.ok(btn, "the li should contain <button class=\"delete\">");
  assert.equal(btn.textContent.trim(), "x", "the delete button text should be x");
});

test("Step 1: the li gets the class priority-<value>", async () => {
  const page = await loadPage();
  addTask(page, "Low task", "low");
  addTask(page, "Medium task", "medium");
  addTask(page, "High task", "high");
  const [low, medium, high] = items(page);
  assert.ok(low.classList.contains("priority-low"), "a Low task should have the class priority-low");
  assert.ok(medium.classList.contains("priority-medium"), "a Medium task should have the class priority-medium");
  assert.ok(high.classList.contains("priority-high"), "a High task should have the class priority-high");
});

test("Step 1: new tasks are added to the end of the list", async () => {
  const page = await loadPage();
  addTask(page, "First");
  addTask(page, "Second");
  addTask(page, "Third");
  assert.deepEqual(items(page).map(itemText), ["First", "Second", "Third"], "tasks should appear in the order they were added");
});

test("Step 1: after adding, the input is cleared and gets the focus back", async () => {
  const page = await loadPage();
  page.$('#task-form [type="submit"]').focus();
  addTask(page, "Buy milk");
  assert.equal(page.$("#task-input").value, "", "the input should be empty after adding a task");
  assert.equal(page.document.activeElement, page.$("#task-input"), "the focus should go back to the input (use .focus())");
});

test("Step 1: an empty task is not added and shows an error", async () => {
  const page = await loadPage();
  const reloaded = addTask(page, "");
  assert.equal(reloaded, false, "the page should not reload");
  assert.equal(items(page).length, 0, "an empty task should not be added");
  const error = page.$("#error");
  assert.ok(!error.hidden, "the #error element should be shown (remove the hidden attribute)");
  assert.equal(error.textContent.trim(), "Please type a task", "the error text should be: Please type a task");
});

test("Step 1: a task with only spaces is not added", async () => {
  const page = await loadPage();
  addTask(page, "    ");
  assert.equal(items(page).length, 0, "a task with only spaces should not be added");
  assert.ok(!page.$("#error").hidden, "the #error element should be shown");
});

test("Step 1: a successful add hides the error again", async () => {
  const page = await loadPage();
  addTask(page, "");
  assert.ok(!page.$("#error").hidden, "the #error element should be shown after an empty submit");
  addTask(page, "Buy milk");
  assert.ok(page.$("#error").hidden, "after a successful add #error should be hidden again (hidden = true)");
});

// ---------- Step 2: mark as done ----------

test("Step 2: clicking a task toggles the done class", async () => {
  const page = await loadPage();
  addTask(page, "Buy milk");
  const li = items(page)[0];
  page.click(li);
  assert.ok(li.classList.contains("done"), "after one click the li should have the class done");
  page.click(li);
  assert.ok(!li.classList.contains("done"), "after a second click the class done should be removed");
});

test("Step 2: clicking the text inside the task also toggles it", async () => {
  const page = await loadPage();
  addTask(page, "Buy milk");
  const li = items(page)[0];
  page.click(li.querySelector(".text"));
  assert.ok(li.classList.contains("done"), "clicking the span inside the li should mark the task as done (use closest)");
});

// ---------- Step 3: delete ----------

test("Step 3: clicking x deletes the task", async () => {
  const page = await loadPage();
  addTask(page, "Buy milk");
  page.click(items(page)[0].querySelector(".delete"));
  assert.equal(items(page).length, 0, "clicking x should remove the li from the list");
});

test("Step 3: x deletes the right task", async () => {
  const page = await loadPage();
  addTask(page, "One");
  addTask(page, "Two");
  addTask(page, "Three");
  page.click(items(page)[1].querySelector(".delete"));
  assert.deepEqual(items(page).map(itemText), ["One", "Three"], "clicking x on 'Two' should delete only 'Two'");
});

test("Step 3: deleting a task does not mark it as done first", async () => {
  const page = await loadPage();
  addTask(page, "One");
  addTask(page, "Two");
  const li = items(page)[0];
  page.click(li.querySelector(".delete"));
  assert.ok(!li.classList.contains("done"), "clicking x should not add the class done to the task");
  assert.equal(leftCount(page), "1", "after deleting one of two tasks, 1 task should be left");
});

// ---------- Step 4: counter ----------

test("Step 4: the counter shows how many tasks are not done", async () => {
  const page = await loadPage();
  addTask(page, "One");
  addTask(page, "Two");
  addTask(page, "Three");
  assert.equal(leftCount(page), "3", "after adding 3 tasks #left should be 3");
  page.click(items(page)[0]);
  assert.equal(leftCount(page), "2", "after marking one as done #left should be 2");
  page.click(items(page)[0]);
  assert.equal(leftCount(page), "3", "after un-marking it #left should be 3 again");
});

test("Step 4: the counter updates after deleting", async () => {
  const page = await loadPage();
  addTask(page, "One");
  addTask(page, "Two");
  addTask(page, "Three");
  page.click(items(page)[0]);
  page.click(items(page)[0].querySelector(".delete"));
  assert.equal(leftCount(page), "2", "deleting a done task should not change the number left");
  page.click(items(page)[0].querySelector(".delete"));
  assert.equal(leftCount(page), "1", "deleting a task that is not done should lower the number left");
});

// ---------- Step 5: filters ----------

test("Step 5: the clicked filter button gets the active class", async () => {
  const page = await loadPage();
  const button = (name) => page.$(`#filters [data-filter="${name}"]`);
  filter(page, "done");
  assert.ok(button("done").classList.contains("active"), "Done should have the class active");
  assert.ok(!button("all").classList.contains("active"), "All should lose the class active");
  filter(page, "active");
  assert.ok(button("active").classList.contains("active"), "Active should have the class active");
  assert.ok(!button("done").classList.contains("active"), "Done should lose the class active");
});

test("Step 5: Active shows only tasks that are not done, Done only the done ones", async () => {
  const page = await loadPage();
  addTask(page, "One");
  addTask(page, "Two");
  addTask(page, "Three");
  page.click(items(page)[1]);
  const [one, two, three] = items(page);

  filter(page, "active");
  assert.deepEqual([one.hidden, two.hidden, three.hidden], [false, true, false], "Active: only the done task (Two) should get the hidden attribute");

  filter(page, "done");
  assert.deepEqual([one.hidden, two.hidden, three.hidden], [true, false, true], "Done: only the done task (Two) should be shown");

  filter(page, "all");
  assert.deepEqual([one.hidden, two.hidden, three.hidden], [false, false, false], "All: every task should be shown");
});

test("Step 5: with the Done filter, a new task is hidden (it is not done)", async () => {
  const page = await loadPage();
  addTask(page, "One");
  page.click(items(page)[0]);
  filter(page, "done");
  addTask(page, "Brand new");
  const newLi = items(page).find((li) => itemText(li) === "Brand new");
  assert.ok(newLi, "the new task should still be added to the list");
  assert.ok(newLi.hidden, "with the Done filter on, the new task should get the hidden attribute");
});

// ---------- Step 6: clear completed ----------

test("Step 6: Clear completed deletes only the done tasks", async () => {
  const page = await loadPage();
  addTask(page, "One");
  addTask(page, "Two");
  addTask(page, "Three");
  page.click(items(page)[0]);
  page.click(items(page)[2]);
  page.click("#clear-done");
  assert.deepEqual(items(page).map(itemText), ["Two"], "only the task that is not done (Two) should stay");
  assert.equal(leftCount(page), "1", "#left should still be 1");
});

// ---------- Step 7: empty list message ----------

test("Step 7: the empty message hides when there is a task and comes back when the list is empty", async () => {
  const page = await loadPage();
  const empty = page.$("#empty");
  addTask(page, "One");
  assert.ok(isHidden(empty), "with one task the #empty message should be hidden");
  page.click(items(page)[0].querySelector(".delete"));
  assert.ok(!isHidden(empty), "after deleting the last task the #empty message should be shown again");
});

test("Step 7: the empty message comes back after Clear completed empties the list", async () => {
  const page = await loadPage();
  const empty = page.$("#empty");
  addTask(page, "One");
  assert.ok(isHidden(empty), "with one task the #empty message should be hidden");
  page.click(items(page)[0]);
  page.click("#clear-done");
  assert.ok(!isHidden(empty), "after clearing every task the #empty message should be shown");
});

// ---------- Bonus: no duplicates (not required for approval) ----------

test("Bonus: a task that already exists is not added (case-insensitive)", { todo: "bonus" }, async () => {
  const page = await loadPage();
  addTask(page, "Buy milk");
  addTask(page, "BUY MILK");
  assert.equal(items(page).length, 1, "a duplicate task should not be added");
  const error = page.$("#error");
  assert.ok(!error.hidden, "the #error element should be shown");
  assert.equal(error.textContent.trim(), "This task already exists", "the error text should be: This task already exists");
});
