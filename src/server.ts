import * as express from 'express'
import * as socket$io from 'socket.io'
import * as config from './config.json'
import * as http from 'http'
import * as path from 'path'
import * as database from './database'
import * as bp from 'body-parser'
import * as models from './models'
import * as session from 'express-session'
import * as uuid from 'uuid'
import { logger } from './logger'

const app = express()
const server = http.createServer(app)
const io = new socket$io.Server(server)

app.use(express.static(path.join('static')))
app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))
app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: config.sessionSecret
  })
)
app.set('view engine', 'pug')

app.all('/', async (req, res) => {
  if (!(req as any).session.user) {
    if (req.query.error) {
      res.status(200).render('login', { error: req.query.error })
    } else {
      res.status(200).render('login')
    }
  } else {
    const decoded = Buffer.from(
      (req as any).session.user as string,
      'base64'
    ).toString('ascii')
    const mass = decoded.split(':')
    const user = await models.User.findOne({
      where: {
        username: mass[0]
      }
    })

    if (user == null) {
      ;(req as any).session.user = undefined
      res.status(200).render('login')
      return
    }

    if ((user as any).password !== mass[1]) {
      ;(req as any).session.user = undefined
      res.status(200).render('login')
      return
    }

    const dashboards = await user.getDashboards()
    const dashboardsEscaped = []

    for (const dashboard of dashboards) {
      dashboardsEscaped.push({
        slug: (dashboard as any).slug,
        name: (dashboard as any).name
      })
    }

    res.status(200).render('main', { dashboards: dashboardsEscaped })
  }
})

app.post('/signup/handler', async (req, res) => {
  if ((req as any).session.user) {
    res.redirect('/')
    return
  }

  const user = await models.User.findOne({
    where: {
      username: req.body.username
    }
  })

  if (user != null) {
    res.redirect(
      `/signup?error=${encodeURIComponent('User is already exists!')}`
    )
    return
  }

  const newUser = await models.User.build({
    username: req.body.username,
    password: req.body.password
  })
  ;(req as any).session.user = Buffer.from(
    `${req.body.username}:${req.body.password}`
  ).toString('base64')

  await newUser.save()

  res.redirect('/')
})

app.post('/login', async (req, res) => {
  if ((req as any).session.user) {
    res.redirect('/')
    return
  }

  const user = await models.User.findOne({
    where: {
      username: req.body.username
    }
  })

  if (user == null) {
    res.redirect(`/?error=${encodeURIComponent('User not found!')}`)
    return
  }

  const anyUser = user as any

  if (anyUser.password === req.body.password) {
    ;(req as any).session.user = Buffer.from(
      `${req.body.username}:${req.body.password}`
    ).toString('base64')
    res.redirect('/')
  } else {
    res.redirect(`/?error=${encodeURIComponent('Invalid password!')}`)
  }
})

app.all('/signup', (req, res) => {
  if ((req as any).session.user) {
    res.redirect('/')
    return
  }

  if (req.query.error) {
    res.status(200).render('signup', { error: req.query.error })
  } else {
    res.status(200).render('signup')
  }
})

app.get('/dashboard/:slug', async (req, res) => {
  if (req.params.slug === 'new') {
    if (!(req as any).session.user) return res.redirect('/')

    if (req.query.error) {
      res.status(200).render('dashboardCreate', { error: req.query.error })
    } else {
      res.status(200).render('dashboardCreate')
    }
  } else {
    if (!(req as any).session.user) return res.redirect('/')

    const dashboard = await models.Dashboard.findOne({
      where: {
        slug: req.params.slug
      }
    })

    if (dashboard == null) {
      res.redirect('/')
      return
    }

    const decoded = Buffer.from(
      (req as any).session.user as string,
      'base64'
    ).toString('ascii')
    const mass = decoded.split(':')

    const user = await models.User.findOne({
      where: {
        username: mass[0]
      }
    })

    const dashboards = await user.getDashboards()

    if (
      dashboards.filter(x => (x as any).id === (dashboard as any).id).length < 1
    )
      return res.redirect('/')

    const exposedNodes = []
    const nodes = await dashboard.getNodes()

    for (const node of nodes) {
      const anyNode = node as any

      exposedNodes.push({
        id: anyNode.id,
        name: anyNode.name,
        dueDate: anyNode.dueDate,
        type: anyNode.type
      })
    }

    res.status(200).render('dashboard', {
      dashboard: {
        id: (dashboard as any).id,
        name: (dashboard as any).name
      },
      backlog: exposedNodes.filter(x => x.type === 'backlog'),
      inProgress: exposedNodes.filter(x => x.type === 'inProgress'),
      done: exposedNodes.filter(x => x.type === 'done')
    })
  }
})

app.post('/dashboard/new/handler', async (req, res) => {
  if (!(req as any).session.user) return res.redirect('/')

  const dashboard = await models.Dashboard.build({
    name: req.body.name,
    slug: uuid.v4()
  })

  await dashboard.save()

  const decoded = Buffer.from(
    (req as any).session.user as string,
    'base64'
  ).toString('ascii')
  const mass = decoded.split(':')

  const user = await models.User.findOne({
    where: {
      username: mass[0]
    }
  })

  const dashboards = await user.getDashboards()
  dashboards.push(dashboard)
  user.dashboardArray = dashboards
  user.putDashboardsToModel()
  await user.save()

  res.redirect('/')
})

io.on('connection', socket => {
  const address = socket.handshake.address
  logger.info(
    `Connected client with address ${address.address}:${address.port}`
  )

  socket.on('disconnect', _ => {
    const address = socket.handshake.address
    logger.info(
      `Disconnected client with address ${address.address}:${address.port}`
    )
  })

  socket.on('updateNode', async data => {
    const node = await models.Node.findOne({
      where: {
        id: data.id
      }
    })

    if (data.name) {
      ;(node as any).name = data.name
    }

    if (data.type) {
      ;(node as any).type = data.type
    }

    await node.save()
  })

  socket.on('createNode', async data => {
    const node = await models.Node.build({
      name: data.name,
      type: data.type
    })

    await node.save()

    const dashboard = await models.Dashboard.findOne({
      where: {
        id: data.dashboard
      }
    })

    const nodes = await dashboard.getNodes()

    nodes.push(node)

    dashboard.nodeArray = nodes
    dashboard.putNodesToModel()
    await dashboard.save()

    socket.emit('createNodeResult', { id: (node as any).id })
  })
})

async function run () {
  await database.tryConnect()

  await models.User.sync()
  await models.Dashboard.sync()
  await models.Node.sync()

  server.listen(config.port, () =>
    logger.info(`Listening on http://localhost:${config.port}`)
  )
}

run()
