import dotenv from 'dotenv';
dotenv.config(); 

import express, { Express, Request, Response } from 'express'
import { API } from './api'
import http from 'http'
import { resolve, dirname } from 'path'
import { Database } from './database'
import bodyParser from 'body-parser'

class Backend {
  // Properties
  private _app: Express
  private _api: API
  private _database: Database
  private _env: string

  // Getters
  public get app(): Express {
    return this._app
  }

  public get api(): API {
    return this._api
  }

  public get database(): Database {
    return this._database
  }

  // Constructor
  constructor() {
    this._app = express()
    this._database = new Database()

    this._app.use(bodyParser.json()); // Für JSON-Parsing
    this._app.use(bodyParser.urlencoded({ extended: true })); // Für URL-encoded-Parsing

    this._api = new API(this._app, this._database)
    this._env = process.env.NODE_ENV || 'development'

    this.setupStaticFiles()
    this.setupRoutes()
    this.startServer()
  }

  // Methods
  private setupStaticFiles(): void {
    this._app.use(express.static('client'))
  }

  private setupRoutes(): void {
    this._app.get('/', (req: Request, res: Response) => {
        const __dirname = resolve(dirname(''));
        res.sendFile(__dirname + '/client/index.html');
    });

    // Neue Routen für Login und Registrierung
    this._app.get('/login', (req: Request, res: Response) => {
        const __dirname = resolve(dirname(''));
        res.sendFile(__dirname + '/client/login.html');
    });

    this._app.get('/register', (req: Request, res: Response) => {
        const __dirname = resolve(dirname(''));
        res.sendFile(__dirname + '/client/register.html');
    });
  }

  private startServer(): void {
    if (this._env === 'production') {
      http.createServer(this.app).listen(3000, () => {
        console.log('Server is listening!')
      })
    }
  }
}

const backend = new Backend()
export const viteNodeApp = backend.app
