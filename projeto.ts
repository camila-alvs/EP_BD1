import chalk from "chalk";

import { Core } from "./core/Core";

const SHOULD_SQL_CONNECT = false;
let isConnected = true;

enum Tables {
  Jogo,
  Reserva,
  Cliente,
  Mesa,
  Funcionario,
  Categoria,
  Pessoa,
}

const DIVIDER =
  "-------------------------------------------------------------------------------\n";
const core = new Core();

// Função para formatar e validar datas
function formatDateForSQL(dateString: string): string {
  // Valida formato YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    throw new Error("Formato de data inválido. Use YYYY-MM-DD");
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error("Data inválida");
  }
  
  return dateString;
}

if (SHOULD_SQL_CONNECT) {
  if (!core.checkConnection()) isConnected = false;
}

(async () => {
  while (isConnected) {
    core.displayInstruction("instrucoesIniciais");
    const informacao =
      (await core.getAnswer("Digite o número da informação desejada", 1)) - 1;

    const tableName = Tables[informacao]
      ? Tables[informacao].toString().toLowerCase()
      : "";

    console.log(
      DIVIDER + chalk.green("Acessando " + Tables[informacao] + "s...")
    );

    let isUsingTable = true;

    while (isUsingTable) {
      core.displayInstruction("instrucoesIniciais");

      const acao =
        (await core.getAnswer("Digite o número da ação desejada", 1, true)) - 1;

      const instrucoesEspecificas =
        "instrucoes/especificas/" + tableName + ".txt";
      const linhasEspecificas = core
        .getFileContents(instrucoesEspecificas)
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const specsFile = "instrucoes/specs/" + tableName + ".txt";
      const specs = core
        .getFileContents(specsFile)
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      if (acao == 0) {
        isUsingTable = false;
      } else if (acao == 1) {
        console.log(DIVIDER);
        const linhas: any[] = await core.queryAsync(
          `SELECT * FROM ${tableName}`
        );
        linhas.forEach((linha) => console.log(linha));
        console.log(DIVIDER);
        await core.questionAsync(
          `Aperte enter para sair do modo de visualização de tabela. `
        );
      } else if (acao == 2) {
        const respostas: string[] = [];
        for (const linha of linhasEspecificas) {
          respostas.push(
            await core.questionAsync(
              `Digite o/a ${linha} do/a ${Tables[informacao]}: `
            )
          );
        }
        const insercao = respostas.map((r, i) => {
          const spec = specs[i];
          if (spec === "number") return Number(r);
          if (spec === "date") {
            try {
              return formatDateForSQL(r);
            } catch (error: any) {
              throw new Error(`Erro no campo ${linhasEspecificas[i]}: ${error.message}`);
            }
          }
          return r;
        });

        const placeholders = linhasEspecificas.map(() => "?").join(", ");
        const sql = `INSERT INTO ${tableName} (${linhasEspecificas.join(
          ", "
        )}) VALUES (${placeholders})`;

        try {
          const results: any = await core.queryAsync(sql, insercao);
          console.log("ID de inserção:", results.insertId);
        } catch (err: any) {
          throw new Error(
            "Houve um erro tentando executar essa ação: " + err.message
          );
        }
      } else if (acao == 3) {
        console.log(DIVIDER);
        console.log(
          "Você deseja apagar o elemento a partir de qual informação?\n1. id_" +
            tableName
        );
        linhasEspecificas.forEach((linha, index) => {
          console.log(index + 2 + ". " + linha);
        });
        console.log(DIVIDER);
        const atributoId = Number(
          await core.questionAsync(`Digite o atributo desejado: `)
        );
        let atributo = "id_" + tableName;
        let spec = "number";
        if (atributoId >= 0 && atributoId <= linhasEspecificas.length + 1) {
          if (atributoId !== 1) {
            atributo = linhasEspecificas[atributoId - 2]!;
            spec = specs[atributoId - 2]!;
          }
        } else {
          throw new Error("Atributo fora da range especifícada");
        }

        console.log(DIVIDER);

        const valorAtributo = await core.questionAsync(
          `Digite o valor de ${atributo}: `
        );
        const remocao = spec == "number" ? Number(valorAtributo) : 
                       spec == "date" ? valorAtributo :
                       valorAtributo;

        const sql = `DELETE FROM ${tableName} WHERE ${atributo} = ?`;

        try {
          const results: any = await core.queryAsync(sql, [remocao]);
          if (results.affectedRows > 0) {
            console.log(`Registro deletado com sucesso.`);
          } else {
            console.log(
              `Nenhum registro encontrado com ${atributo} = ${valorAtributo}.`
            );
          }
        } catch (err: any) {
          throw new Error(
            "Houve um erro tentando executar essa ação: " + err.message
          );
        }
      } else if (acao == 4) {
        console.log(DIVIDER);
        console.log(
          "Qual é o id_" + tableName + " do elemento que você deseja editar?"
        );
        console.log(DIVIDER);

        const idElemento = Number(
          await core.questionAsync(`Digite o valor de id_${tableName}: `)
        );

        console.log(DIVIDER);

        linhasEspecificas.forEach((linha, index) => {
          console.log(index + 1 + ". " + linha);
        });

        const atributoId = Number(
          (await core.getAnswer(
            `Digite número do atributo que você deseja editar: `,
            linhasEspecificas.length
          )) - 1
        );

        let atributo = "";
        let spec = "number";
        atributo = linhasEspecificas[atributoId]!;
        spec = specs[atributoId]!;

        console.log(DIVIDER);

        let valorNovo: any = await core.questionAsync(
          `Digite novo valor de ${atributo}: `
        );

        valorNovo = spec == "number" ? Number(valorNovo) : 
                   spec == "date" ? valorNovo :
                   valorNovo;

        const sql = `UPDATE ${tableName} SET ${atributo} = ? WHERE id_${tableName} = ?`;

        const args = [valorNovo, idElemento];

        try {
          const results: any = await core.queryAsync(sql, args);
          if (results.affectedRows > 0) {
            console.log(`Registro atualizado com sucesso.`);
          } else {
            console.log(
              `Nenhum registro encontrado com id_${Tables[informacao]} = ${idElemento}.`
            );
          }
        } catch (err: any) {
          throw new Error(
            "Houve um erro tentando executar essa ação: " + err.message
          );
        }
      } else {
        throw new Error("Ação fora da lista de valores possíveis.");
      }
    }
  }
})();