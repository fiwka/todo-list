import * as database from './database'
import * as sequelize from 'sequelize'

export class User extends sequelize.Model {
  dashboardArray: Dashboard[] = []

  async getDashboards (): Promise<Dashboard[]> {
    if (!((this as any).dashboardList as string)) return []

    const ids = ((this as any).dashboardList as string).split(',').map(a => +a)

    const dashboardArray = []

    for (const id of ids) {
      dashboardArray.push(
        await Dashboard.findOne({
          where: {
            id
          }
        })
      )
    }

    this.dashboardArray = dashboardArray

    return dashboardArray
  }

  putDashboardsToModel () {
    ;(this as any).dashboardList = [...this.dashboardArray]
      .map(x => (x as any).id)
      .join(',')
  }
}

User.init(
  {
    id: {
      type: sequelize.DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: sequelize.DataTypes.STRING,
      unique: true
    },
    password: {
      type: sequelize.DataTypes.STRING
    },
    dashboardList: {
      type: sequelize.DataTypes.TEXT
    }
  },
  { sequelize: database.database }
)

export class Dashboard extends sequelize.Model {
  nodeArray: Node[] = []

  async getNodes (): Promise<Node[]> {
    if (!((this as any).nodes as string)) return []

    const ids = ((this as any).nodes as string).split(',').map(a => +a)

    const nodeArray = []

    for (const id of ids) {
      nodeArray.push(
        await Node.findOne({
          where: {
            id
          }
        })
      )
    }

    this.nodeArray = nodeArray

    return nodeArray
  }

  putNodesToModel () {
    ;(this as any).nodes = [...this.nodeArray].map(x => (x as any).id).join(',')
  }
}

Dashboard.init(
  {
    id: {
      type: sequelize.DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: sequelize.DataTypes.STRING
    },
    slug: {
      type: sequelize.DataTypes.STRING
    },
    nodes: {
      type: sequelize.DataTypes.TEXT
    }
  },
  { sequelize: database.database }
)

export class Node extends sequelize.Model {
  humanizeDueDate () {
    const datetime = (this as any).dueDate as number
    const date = new Date(datetime)
    return date.toLocaleDateString()
  }
}

Node.init(
  {
    id: {
      type: sequelize.DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: sequelize.DataTypes.STRING
    },
    dueDate: {
      type: sequelize.DataTypes.BIGINT
    },
    type: {
      type: sequelize.DataTypes.STRING
    }
  },
  { sequelize: database.database }
)
