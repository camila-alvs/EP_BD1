import * as fs from "fs";
import chalk from "chalk";

const readline = require("readline");
const mysql = require("mysql");

export class Core {
  public host = "localhost";
  public user = "root";
  public password = "root";
  public db = "playeasy";

  public rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  public pool: any;

  public constructor() {
    this.host = process.env.HOST_MYSQL || "localhost";
    this.user = process.env.USUARIO_MYSQL || "root";
    this.password = process.env.SENHA_MYSQL || "root";
    this.db = process.env.DATABASE_MYSQL || "playeasy";
    this.pool = mysql.createPool({
      host: this.host,
      user: this.user,
      password: this.password,
      database: this.db,
      connectionLimit: 10,
    });
  }

  public getFileContents(file: string): string {
    if (!fs.existsSync(file)) throw new Error("Arquivo não encontrado.");
    return fs.readFileSync(file, "utf8");
  }

  public questionAsync(prompt: string): Promise<string> {
    return new Promise((resolve) => this.rl.question(prompt, resolve));
  }

  public queryAsync(sql: string, values: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.pool.query(sql, values, (err: any, results: any) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }

  public async getAnswer(
    instruction: string,
    maxValue: number,
    canBeZero = false
  ): Promise<number> {
    const numeroTabela = await this.questionAsync(instruction + ": ");
    const informacao = Number(numeroTabela);
    if (
      informacao > maxValue ||
      (informacao == 0 && !canBeZero) ||
      informacao < 0
    ) {
      throw new Error("Ação proíbida, tente novamente.");
    }
    return informacao;
  }

  public checkConnection(): boolean {
    // Esse valor será atualizado dentro do callback
    let connected = true;

    this.pool.getConnection((err: any, connection: any) => {
      if (err) {
        console.error(chalk.red("Erro de conexão:"), err);
        connected = false;
        return;
      }

      console.log(
        chalk.green(
          "Conexão bem sucedida!\n\n" +
            chalk.yellow("Bem vinde ao portal Playeasy!")
        )
      );

      connection.release();
    });

    return connected;
  }

  public displayInstruction(
    instruction: string,
    color = chalk.reset,
    enumerate = false
  ) {
    const instructionFile = "instructions/" + instruction + ".txt";
    const instructionLines = this.getFileContents(instructionFile).split("\n");
    instructionLines.forEach((line, index) => {
      console.log(enumerate == true ? index + 1 + " " : "" + color(line));
    });
  }
}
