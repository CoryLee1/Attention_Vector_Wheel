let protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
let socket = new WebSocket(`${protocol}${window.location.host}`);

class AttentionPointer {
  constructor(centerX, centerY) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.angle = 0;
    this.maxLength = 150;
    this.minLength = 0;
    this.currentLength = this.maxLength;
    this.rotationSpeed = 0.001;
    this.shrinkSpeed = 0.1;
    this.dragging = false;
    this.lastTaskIndex = 0;
  }

  getTipPosition() {
    return {
      x: this.centerX + Math.cos(this.angle) * this.currentLength,
      y: this.centerY + Math.sin(this.angle) * this.currentLength,
    };
  }

  getAttentionScore() {
    return map(this.currentLength, this.minLength, this.maxLength, 0, 100);
  }

  update(taskWheel) {
    if (!this.dragging) {
      // 自动旋转
      this.angle += this.rotationSpeed;

      // 缓慢缩短指针长度
      this.currentLength = Math.max(
        this.currentLength - this.shrinkSpeed,
        this.minLength
      );

      // 检查是否进入新任务区
      const currentTaskIndex = taskWheel.getTaskIndexAtAngle(this.angle);

      // 如果进入新任务区，重置指针长度
      if (currentTaskIndex !== this.lastTaskIndex) {
        this.currentLength = this.maxLength;
        this.lastTaskIndex = currentTaskIndex;
      }
    }
  }

  checkMousePressed(mouseX, mouseY) {
    const tip = this.getTipPosition();
    const distance = dist(mouseX, mouseY, tip.x, tip.y);
    return distance < 15;
  }

  handleMouseDrag(mouseX, mouseY) {
    if (this.dragging) {
      const dx = mouseX - this.centerX;
      const dy = mouseY - this.centerY;
      this.angle = Math.atan2(dy, dx);

      const newLength = dist(this.centerX, this.centerY, mouseX, mouseY);
      this.currentLength = constrain(newLength, this.minLength, this.maxLength);
    }
  }

  draw() {
    const tip = this.getTipPosition();

    stroke(255, 0, 0);
    strokeWeight(3);
    line(this.centerX, this.centerY, tip.x, tip.y);

    fill(255, 0, 0);
    noStroke();
    ellipse(tip.x, tip.y, 10, 10);
  }
}

class Task {
  constructor(name, percentage) {
    this.name = name;
    this.percentage = percentage; // 任务时间百分比
  }
}

class TaskWheel {
  constructor(centerX, centerY, radius) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.radius = radius;
    this.innerRadius = 50;
    this.tasks = [
      new Task("Stream Opening", 10),
      new Task("Story 1", 30),
      new Task("Story 2", 10),
      new Task("Story 3", 30),
      new Task("Streaming Ending", 20),
    ];
    this.startTime = millis();
    this.totalDuration = 20 * 60 * 1000; // 20分钟
    this.selectedTaskIndex = -1;
  }

  getTotalPercentage() {
    return this.tasks.reduce((sum, task) => sum + task.percentage, 0);
  }

  normalizePercentages() {
    const total = this.getTotalPercentage();
    if (total > 0) {
      this.tasks.forEach((task) => {
        task.percentage = (task.percentage / total) * 100;
      });
    }
  }

  getTaskIndexAtAngle(angle) {
    const normalizedAngle = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
    let accumulatedAngle = 0;

    for (let i = 0; i < this.tasks.length; i++) {
      const taskAngle = (this.tasks[i].percentage / 100) * TWO_PI;
      if (
        normalizedAngle >= accumulatedAngle &&
        normalizedAngle < accumulatedAngle + taskAngle
      ) {
        return i;
      }
      accumulatedAngle += taskAngle;
    }
    return 0;
  }

  getStreamProgress() {
    const elapsedTime = millis() - this.startTime;
    return constrain(map(elapsedTime, 0, this.totalDuration, 0, 100), 0, 100);
  }

  getTaskAtAngle(angle) {
    const index = this.getTaskIndexAtAngle(angle);
    return this.tasks[index];
  }

  // **🚀 新增 JSON 生成方法**
  getJSON(pointer) {
    let attentionScore = pointer.getAttentionScore();
    let isFatigued = attentionScore < 50;
    let currentTask = this.getTaskAtAngle(pointer.angle);

    return {
      attention_wheel: {
        total_duration: this.totalDuration / 1000, // 秒
        attention_score: attentionScore,
        is_fatigued: isFatigued,
        current_task: currentTask.name,
        rotation_angle: degrees(pointer.angle),
        pointer_length: pointer.currentLength,
        stream_progress: this.getStreamProgress(),
        tasks: this.tasks.map(task => ({
          name: task.name,
          percentage: task.percentage
        }))
      }
    };
  }

  draw() {
    stroke(255, 105, 180);
    strokeWeight(3);
    noFill();
    ellipse(this.centerX, this.centerY, this.radius * 2 + 20);

    fill(100, 150, 255, 100);
    noStroke();
    ellipse(this.centerX, this.centerY, this.innerRadius * 2);

    this.drawSections();
  }

  drawSections() {
    let startAngle = 0;

    for (let i = 0; i < this.tasks.length; i++) {
      const task = this.tasks[i];
      const sectionAngle = (task.percentage / 100) * TWO_PI;
      const endAngle = startAngle + sectionAngle;

      fill(
        i === this.selectedTaskIndex
          ? color(200, 200, 0, 100)
          : color(200, 200, 200, 50)
      );
      stroke(0);
      arc(
        this.centerX,
        this.centerY,
        this.radius * 2,
        this.radius * 2,
        startAngle,
        endAngle,
        PIE
      );

      const labelAngle = startAngle + sectionAngle / 2;
      const labelX = this.centerX + Math.cos(labelAngle) * (this.radius * 0.7);
      const labelY = this.centerY + Math.sin(labelAngle) * (this.radius * 0.7);

      fill(0);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(14);
      text(task.name + "\n" + task.percentage.toFixed(1) + "%", labelX, labelY);

      startAngle = endAngle;
    }
  }
}

class ProgressBar {
  constructor(x, y, width, height, label) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.label = label;
    this.value = 0;
    this.color = color(75, 192, 192);
  }

  update(newValue) {
    this.value = constrain(newValue, 0, 100);
  }

  setColor(r, g, b) {
    this.color = color(r, g, b);
  }

  draw() {
    noStroke();
    fill(220);
    rect(this.x, this.y, this.width, this.height, this.height / 2);

    fill(this.color);
    const progressWidth = map(this.value, 0, 100, 0, this.width);
    rect(this.x, this.y, progressWidth, this.height, this.height / 2);

    fill(0);
    textSize(12);
    textAlign(LEFT, CENTER);
    text(
      this.label + ": " + Math.round(this.value) + "%",
      this.x + 10,
      this.y + this.height / 2
    );
  }
}

class Button {
  constructor(x, y, width, height, label, callback) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.label = label;
    this.callback = callback;
  }

  isMouseOver(mouseX, mouseY) {
    return (
      mouseX >= this.x &&
      mouseX <= this.x + this.width &&
      mouseY >= this.y &&
      mouseY <= this.y + this.height
    );
  }

  draw() {
    fill(100, 100, 200);
    if (this.isMouseOver(mouseX, mouseY)) {
      fill(120, 120, 220);
    }
    stroke(0);
    rect(this.x, this.y, this.width, this.height, 5);

    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    text(this.label, this.x + this.width / 2, this.y + this.height / 2);
  }
}

class TaskEditor {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.taskNameInput = null;
    this.taskPercentageInput = null;
    this.visible = false;
    this.taskIndex = -1;

    // 创建编辑器界面元素
    this.createInputs();

    // 创建按钮
    const buttonWidth = 80;
    const buttonHeight = 30;
    const buttonSpacing = 10;

    this.saveButton = new Button(
      this.x + this.width - buttonWidth * 2 - buttonSpacing,
      this.y + this.height - buttonHeight - 10,
      buttonWidth,
      buttonHeight,
      "保存",
      () => this.saveTask()
    );

    this.cancelButton = new Button(
      this.x + this.width - buttonWidth,
      this.y + this.height - buttonHeight - 10,
      buttonWidth,
      buttonHeight,
      "取消",
      () => this.hide()
    );
  }

  createInputs() {
    // 创建任务名称输入框
    this.taskNameInput = createInput("");
    this.taskNameInput.position(this.x + 100, this.y + 30);
    this.taskNameInput.size(this.width - 120, 25);
    this.taskNameInput.hide();

    // 创建任务百分比输入框
    this.taskPercentageInput = createInput("");
    this.taskPercentageInput.position(this.x + 100, this.y + 70);
    this.taskPercentageInput.size(this.width - 120, 25);
    this.taskPercentageInput.attribute("type", "number");
    this.taskPercentageInput.attribute("min", "1");
    this.taskPercentageInput.attribute("max", "100");
    this.taskPercentageInput.hide();
  }

  // 显示编辑器
  show(taskIndex, name, percentage) {
    this.visible = true;
    this.taskIndex = taskIndex;

    // 设置输入框值
    this.taskNameInput.value(name || "");
    this.taskPercentageInput.value(percentage || "");

    // 显示输入框
    this.taskNameInput.show();
    this.taskPercentageInput.show();
  }

  // 隐藏编辑器
  hide() {
    this.visible = false;
    this.taskNameInput.hide();
    this.taskPercentageInput.hide();
  }

  // 保存任务
  saveTask() {
    const name = this.taskNameInput.value();
    const percentage = parseFloat(this.taskPercentageInput.value());

    if (name && !isNaN(percentage) && percentage > 0) {
      if (this.taskIndex === -1) {
        // 添加新任务
        taskWheel.addTask(name, percentage);
      } else {
        // 更新现有任务
        taskWheel.updateTask(this.taskIndex, name, percentage);
      }
      this.hide();
    } else {
      alert("请输入有效的任务名称和百分比！");
    }
  }

  // 检查鼠标点击
  checkMousePressed(mouseX, mouseY) {
    if (this.visible) {
      if (this.saveButton.isMouseOver(mouseX, mouseY)) {
        this.saveButton.callback();
        return true;
      } else if (this.cancelButton.isMouseOver(mouseX, mouseY)) {
        this.cancelButton.callback();
        return true;
      }
    }
    return false;
  }

  // 绘制编辑器
  draw() {
    if (!this.visible) return;

    // 绘制背景
    fill(240);
    stroke(0);
    rect(this.x, this.y, this.width, this.height, 10);

    // 绘制标题
    fill(0);
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(18);
    text(
      this.taskIndex === -1 ? "添加新任务" : "编辑任务",
      this.x + 10,
      this.y + 15
    );

    // 绘制标签
    textSize(14);
    text("任务名称:", this.x + 10, this.y + 42);
    text("百分比:", this.x + 10, this.y + 82);

    // 绘制按钮
    this.saveButton.draw();
    this.cancelButton.draw();
  }
}

// 全局变量
let taskWheel;
let attentionPointer;
let attentionBar;
let streamProgressBar;
let taskEditor;

// 界面按钮
let addTaskButton;
let deleteTaskButton;
let resetWheelButton;

function setup() {
  createCanvas(800, 600);
  const centerX = width / 2;
  const centerY = height / 3 + 50;

  taskWheel = new TaskWheel(centerX, centerY, 150);
  attentionPointer = new AttentionPointer(centerX, centerY);

  let protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
  socket = new WebSocket(`${protocol}${window.location.host}`);


  socket.onopen = function () {
    console.log("Connected to WebSocket server");
  };

  socket.onmessage = function (event) {
    let receivedData = JSON.parse(event.data);
    console.log("Received from server:", receivedData);
  };

  socket.onclose = function () {
    console.log("Disconnected from WebSocket server");
  };

  // 创建进度条
  attentionBar = new ProgressBar(
    50,
    height - 120,
    width - 100,
    20,
    "Attention Score"
  );
  attentionBar.setColor(255, 99, 132);

  streamProgressBar = new ProgressBar(
    50,
    height - 80,
    width - 100,
    20,
    "Stream Progress"
  );
  streamProgressBar.setColor(54, 162, 235);

  // 创建任务编辑器
  taskEditor = new TaskEditor(centerX - 200, height - 250, 400, 150);

  // 创建界面按钮
  const buttonWidth = 120;
  const buttonHeight = 30;
  const buttonSpacing = 20;

  addTaskButton = new Button(
    width - buttonWidth - 10,
    20,
    buttonWidth,
    buttonHeight,
    "添加任务",
    () => taskEditor.show(-1, "", "")
  );

  deleteTaskButton = new Button(
    width - buttonWidth - 10,
    20 + buttonHeight + buttonSpacing,
    buttonWidth,
    buttonHeight,
    "删除选中任务",
    deleteSelectedTask
  );

  resetWheelButton = new Button(
    width - buttonWidth - 10,
    20 + (buttonHeight + buttonSpacing) * 2,
    buttonWidth,
    buttonHeight,
    "重置轮盘",
    () => (taskWheel.startTime = millis())
  );
}

function deleteSelectedTask() {
  if (taskWheel.selectedTaskIndex >= 0) {
    taskWheel.removeTask(taskWheel.selectedTaskIndex);
    taskWheel.selectedTaskIndex = -1;
  } else {
    alert("请先选择一个任务！");
  }
}

function draw() {
  background(240);

  attentionPointer.update(taskWheel);
  attentionBar.update(attentionPointer.getAttentionScore());
  streamProgressBar.update(taskWheel.getStreamProgress());

  taskWheel.draw();
  attentionPointer.draw();

  drawTaskLabels();
  drawPointerVisualizer(20, height - 170, 200, 40);

  attentionBar.draw();
  streamProgressBar.draw();

  addTaskButton.draw();
  deleteTaskButton.draw();
  resetWheelButton.draw();

  taskEditor.draw();

  fill(0);
  textAlign(LEFT, CENTER);
  textSize(14);
  text("总百分比: " + taskWheel.getTotalPercentage().toFixed(1) + "%", 20, 30);

  textAlign(LEFT, CENTER);
  textSize(12);
  text("点击任务区域选择任务，双击编辑任务", 20, 50);
  text("拖动红点调整指针", 20, 70);

  // **🚀 在控制台输出 Attention Wheel JSON**
  console.log(JSON.stringify(taskWheel.getJSON(attentionPointer), null, 2));
  if (socket.readyState === WebSocket.OPEN) {
    let jsonData = taskWheel.getJSON(attentionPointer);
    socket.send(JSON.stringify(jsonData));
  }

}

function drawTaskLabels() {
  const currentTask = taskWheel.getTaskAtAngle(attentionPointer.angle);

  // 在中心显示当前任务
  fill(0);
  textSize(16);
  textAlign(CENTER, CENTER);
  text(currentTask.name, taskWheel.centerX, taskWheel.centerY);

  // 在底部显示当前任务
  fill(0);
  textSize(16);
  textAlign(CENTER);
  text(
    "当前任务: " +
    currentTask.name +
    " (" +
    currentTask.percentage.toFixed(1) +
    "%)",
    width / 2,
    height - 30
  );
}

function drawPointerVisualizer(x, y, width, height) {
  let mouse = createVector(
    attentionPointer.getTipPosition().x - attentionPointer.centerX,
    attentionPointer.getTipPosition().y - attentionPointer.centerY
  );

  let m = mouse.mag();

  fill(0);
  textSize(14);
  textAlign(LEFT, BOTTOM);
  text("Pointer Magnitude: ", x, y - 5);

  fill(0);
  rect(x, y, map(m, 0, attentionPointer.maxLength, 0, width), height);

  fill(255);
  textAlign(LEFT, CENTER);
  text(Math.round(m), x + 10, y + height / 2);
}

function mousePressed() {
  // 检查编辑器点击
  if (taskEditor.visible && taskEditor.checkMousePressed(mouseX, mouseY)) {
    return;
  }

  // 检查按钮点击
  if (addTaskButton.isMouseOver(mouseX, mouseY)) {
    addTaskButton.callback();
    return;
  }

  if (deleteTaskButton.isMouseOver(mouseX, mouseY)) {
    deleteTaskButton.callback();
    return;
  }

  if (resetWheelButton.isMouseOver(mouseX, mouseY)) {
    resetWheelButton.callback();
    return;
  }

  // 检查指针点击
  if (attentionPointer.checkMousePressed(mouseX, mouseY)) {
    attentionPointer.dragging = true;
    return;
  }

  // 检查任务点击
  const taskIndex = taskWheel.checkTaskClicked(mouseX, mouseY);
  if (taskIndex >= 0) {
    taskWheel.selectedTaskIndex = taskIndex;
  } else {
    taskWheel.selectedTaskIndex = -1;
  }
}

function mouseDragged() {
  attentionPointer.handleMouseDrag(mouseX, mouseY);
}

function mouseReleased() {
  attentionPointer.dragging = false;
}

function doubleClicked() {
  // 双击编辑任务
  if (!taskEditor.visible) {
    const taskIndex = taskWheel.checkTaskClicked(mouseX, mouseY);
    if (taskIndex >= 0) {
      const task = taskWheel.tasks[taskIndex];
      taskEditor.show(taskIndex, task.name, task.percentage);
    }
  }
}
