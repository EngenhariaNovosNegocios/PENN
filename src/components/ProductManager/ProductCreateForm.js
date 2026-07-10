export default function ProductCreateForm({
  form,
  statusOptions,
  onUpdateField,
  onSubmit,
  isSubmitting,
}) {
  return (
    <section className="panel form-panel">
      <div className="panel-heading">
        <div>
          <span className="form-step">Novo cadastro</span>
          <h2>Informações do produto</h2>
        </div>
        <span>Campos com * são obrigatórios</span>
      </div>

      <form className="product-form" onSubmit={onSubmit}>
        <label>
          Nome do produto
          <input
            name="name"
            onChange={onUpdateField}
            placeholder="Ex.: Conjunto mecanico especial"
            required
            value={form.name}
          />
        </label>

        <label>
          Codigo
          <input
            name="code"
            onChange={onUpdateField}
            placeholder="Ex.: PENN-003"
            required
            value={form.code}
          />
        </label>

        <label>
          Categoria
          <input
            name="category"
            onChange={onUpdateField}
            placeholder="Ex.: Produto tecnico"
            value={form.category}
          />
        </label>

        <label>
          NCM
          <input
            inputMode="numeric"
            name="ncm"
            onChange={onUpdateField}
            placeholder="Ex.: 8537.10.90"
            value={form.ncm}
          />
        </label>

        <label>
          Codigo SAP
          <input
            name="sap_material_code"
            onChange={onUpdateField}
            placeholder="Ex.: 0000001234"
            value={form.sap_material_code}
          />
        </label>

        <label>
          Centro SAP
          <input
            name="sap_plant"
            onChange={onUpdateField}
            placeholder="Ex.: 1000"
            value={form.sap_plant}
          />
        </label>

        <label>
          Unidade
          <input
            name="sap_unit"
            onChange={onUpdateField}
            placeholder="Ex.: UN"
            value={form.sap_unit}
          />
        </label>

        <label>
          Grupo mercadorias
          <input
            name="sap_material_group"
            onChange={onUpdateField}
            placeholder="Ex.: ELE"
            value={form.sap_material_group}
          />
        </label>

        <label>
          Responsavel
          <input
            name="owner"
            onChange={onUpdateField}
            placeholder="Ex.: Engenharia"
            value={form.owner}
          />
        </label>

        <label>
          Status
          <select name="status" onChange={onUpdateField} value={form.status}>
            {Object.entries(statusOptions).map(([value, option]) => (
              <option key={value} value={value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Origem
          <select
            name="sync_source"
            onChange={onUpdateField}
            value={form.sync_source}
          >
            <option value="manual">Manual</option>
            <option value="sap">SAP</option>
            <option value="importacao">Importacao</option>
          </select>
        </label>

        <label className="wide-field">
          Caracteristicas
          <textarea
            name="characteristics"
            onChange={onUpdateField}
            placeholder="Descreva aplicacao, variacoes, requisitos tecnicos ou observacoes comerciais."
            rows="4"
            value={form.characteristics}
          />
        </label>

        <div className="form-actions">
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Cadastrando..." : "Cadastrar produto"}
          </button>
        </div>
      </form>
    </section>
  );
}
