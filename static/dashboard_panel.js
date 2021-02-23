const blnt = document.querySelector('#blnt')
const ipnt = document.querySelector('#ipnt')
const dnt = document.querySelector('#dnt')
const nodeList = document.querySelectorAll('.node-list')

const socket = io()

const words = [
  ['build', 'create', 'delete'],
  ['house', 'task', 'car']
]

function pick (arr) {
  return arr[random(0, arr.length - 1)]
}

function random (min, max) {
  let rand = min - 0.5 + Math.random() * (max - min + 1)
  return Math.round(rand)
}

for (const list of nodeList) {
  list.addEventListener('dragstart', event => {
    event.target.classList.add('selected')
  })

  list.addEventListener('dragend', event => {
    event.target.classList.remove('selected')
  })

  list.addEventListener('dragover', event => {
    event.preventDefault()

    const activeElement = document.querySelector('.selected')
    const currentElement = event.target

    const isMoveable =
      activeElement !== currentElement &&
      currentElement.classList.contains('node-list')

    if (!isMoveable) return

    const index = +currentElement.getAttribute('data-index')
    const nodeId = +activeElement.getAttribute('data-node-id')

    switch (index) {
      case 0: {
        socket.emit('updateNode', { id: nodeId, type: 'backlog' })
        break
      }
      case 1: {
        socket.emit('updateNode', { id: nodeId, type: 'inProgress' })
        break
      }
      case 2: {
        socket.emit('updateNode', { id: nodeId, type: 'done' })
        break
      }
    }

    currentElement.appendChild(activeElement)
  })
}

dnt.addEventListener('click', _ => {
  const name = pick(words[0]) + ' ' + pick(words[1])

  socket.emit('createNode', {
    name,
    type: 'done',
    dashboard: +document.body.getAttribute('data-dashboard-id')
  })

  socket.once('createNodeResult', result => {
    const node = document.createElement('li')
    node.draggable = true
    node.classList.add('node')
    node.setAttribute('data-node-id', result.id)

    const input = document.createElement('input')
    input.type = 'text'
    input.value = name
    input.onkeydown = event => check(event, result.id)

    const button = document.createElement('button')
    button.classList.add('due-data-button')
    button.innerHTML = '<i class="fas fa-table"></i>'

    node.appendChild(input)
    node.appendChild(button)

    nodeList[2].appendChild(node)
  })
})

ipnt.addEventListener('click', _ => {
  const name = pick(words[0]) + ' ' + pick(words[1])

  socket.emit('createNode', {
    name,
    type: 'inProgress',
    dashboard: +document.body.getAttribute('data-dashboard-id')
  })

  socket.once('createNodeResult', result => {
    const node = document.createElement('li')
    node.draggable = true
    node.classList.add('node')
    node.setAttribute('data-node-id', result.id)

    const input = document.createElement('input')
    input.type = 'text'
    input.value = name
    input.onkeydown = event => check(event, result.id)

    const button = document.createElement('button')
    button.classList.add('due-data-button')
    button.innerHTML = '<i class="fas fa-table"></i>'

    node.appendChild(input)
    node.appendChild(button)

    nodeList[1].appendChild(node)
  })
})

blnt.addEventListener('click', _ => {
  const name = pick(words[0]) + ' ' + pick(words[1])

  socket.emit('createNode', {
    name,
    type: 'backlog',
    dashboard: +document.body.getAttribute('data-dashboard-id')
  })

  socket.once('createNodeResult', result => {
    const node = document.createElement('li')
    node.draggable = true
    node.classList.add('node')
    node.setAttribute('data-node-id', result.id)

    const input = document.createElement('input')
    input.type = 'text'
    input.value = name
    input.onkeydown = event => check(event, result.id)

    const button = document.createElement('button')
    button.classList.add('due-data-button')
    button.innerHTML = '<i class="fas fa-table"></i>'

    node.appendChild(input)
    node.appendChild(button)

    nodeList[0].appendChild(node)
  })
})

function check (element, id) {
  socket.emit('updateNode', { id, name: element.value })
}
