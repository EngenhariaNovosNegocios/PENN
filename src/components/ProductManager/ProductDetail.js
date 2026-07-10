import { tabs } from "./constants";
import { formatRate } from "./utils";

export default function ProductDetail({
  selectedProduct,
  statusOptions,
  isDeletingProduct,
  onDeleteProduct,
  activeTab,
  onOpenTab,
  selectedStructureItems,
  selectedIssues,
  selectedNcmTax,
  editForm,
  onUpdateEditField,
  onUpdateSelectedProduct,
  isSavingEdit,
  structureForm,
  onUpdateStructureField,
  onAddStructureItem,
  isAddingStructure,
  onDeleteStructureItem,
  issueForm,
  onUpdateIssueField,
  onAddIssue,
  isAddingIssue,
  onResolveIssue,
}) {
  return (
    <section className="panel product-detail" aria-label="Detalhes do produto">
      {!selectedProduct && (
        <p className="empty-state">Cadastre ou selecione um produto.</p>
      )}

      {selectedProduct && (
        <>
          <div className="detail-top">
            <div>
              <span className="muted-label">{selectedProduct.code}</span>
              <h2>{selectedProduct.name}</h2>
            </div>
            <div className="detail-actions">
              <span className={`status-badge ${selectedProduct.status}`}>
                {statusOptions[selectedProduct.status]?.label ??
                  selectedProduct.status}
              </span>
              <button
                className="danger-button"
                disabled={isDeletingProduct}
                onClick={onDeleteProduct}
                type="button"
              >
                {isDeletingProduct ? "Excluindo..." : "Excluir produto"}
              </button>
            </div>
          </div>

          <div className="detail-tabs" role="tablist" aria-label="Dados do produto">
            {tabs.map((tab) => (
              <button
                className={activeTab === tab.id ? "active" : ""}
                key={tab.id}
                onClick={() => onOpenTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <section className="tab-panel" aria-label="Resumo do produto">
              <dl className="detail-grid">
                <div>
                  <dt>Categoria</dt>
                  <dd>{selectedProduct.category || "Nao informado"}</dd>
                </div>
                <div>
                  <dt>NCM</dt>
                  <dd>{selectedProduct.ncm || "Nao informado"}</dd>
                </div>
                <div>
                  <dt>Codigo SAP</dt>
                  <dd>{selectedProduct.sap_material_code || "Nao vinculado"}</dd>
                </div>
                <div>
                  <dt>Responsavel</dt>
                  <dd>{selectedProduct.owner || "Nao informado"}</dd>
                </div>
                <div>
                  <dt>Estrutura</dt>
                  <dd>{selectedStructureItems.length} itens</dd>
                </div>
                <div>
                  <dt>Problemas</dt>
                  <dd>{selectedIssues.length} abertos</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    {statusOptions[selectedProduct.status]?.description ??
                      "Status informado no cadastro."}
                  </dd>
                </div>
              </dl>

              <div className="text-block">
                <h3>Caracteristicas</h3>
                <p>
                  {selectedProduct.characteristics ||
                    "Sem caracteristicas cadastradas."}
                </p>
              </div>
            </section>
          )}

          {activeTab === "edit" && (
            <section className="tab-panel" aria-label="Edicao do produto">
              <form
                className="product-form edit-product-form"
                onSubmit={onUpdateSelectedProduct}
              >
                <label>
                  Nome do produto
                  <input
                    name="name"
                    onChange={onUpdateEditField}
                    required
                    value={editForm.name}
                  />
                </label>

                <label>
                  Codigo
                  <input
                    name="code"
                    onChange={onUpdateEditField}
                    required
                    value={editForm.code}
                  />
                </label>

                <label>
                  Categoria
                  <input
                    name="category"
                    onChange={onUpdateEditField}
                    value={editForm.category}
                  />
                </label>

                <label>
                  NCM
                  <input
                    inputMode="numeric"
                    name="ncm"
                    onChange={onUpdateEditField}
                    value={editForm.ncm}
                  />
                </label>

                <label>
                  Codigo SAP
                  <input
                    name="sap_material_code"
                    onChange={onUpdateEditField}
                    value={editForm.sap_material_code}
                  />
                </label>

                <label>
                  Centro SAP
                  <input
                    name="sap_plant"
                    onChange={onUpdateEditField}
                    value={editForm.sap_plant}
                  />
                </label>

                <label>
                  Unidade
                  <input
                    name="sap_unit"
                    onChange={onUpdateEditField}
                    value={editForm.sap_unit}
                  />
                </label>

                <label>
                  Grupo mercadorias
                  <input
                    name="sap_material_group"
                    onChange={onUpdateEditField}
                    value={editForm.sap_material_group}
                  />
                </label>

                <label>
                  Responsavel
                  <input
                    name="owner"
                    onChange={onUpdateEditField}
                    value={editForm.owner}
                  />
                </label>

                <label>
                  Origem
                  <select
                    name="sync_source"
                    onChange={onUpdateEditField}
                    value={editForm.sync_source}
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
                    onChange={onUpdateEditField}
                    rows="4"
                    value={editForm.characteristics}
                  />
                </label>

                <div className="form-actions">
                  <button disabled={isSavingEdit} type="submit">
                    {isSavingEdit ? "Salvando..." : "Salvar alteracoes"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {activeTab === "sap" && (
            <section className="tab-panel" aria-label="Dados SAP">
              <dl className="detail-grid sap-grid">
                <div>
                  <dt>Codigo material SAP</dt>
                  <dd>{selectedProduct.sap_material_code || "Nao vinculado"}</dd>
                </div>
                <div>
                  <dt>Centro</dt>
                  <dd>{selectedProduct.sap_plant || "Nao informado"}</dd>
                </div>
                <div>
                  <dt>Unidade</dt>
                  <dd>{selectedProduct.sap_unit || "Nao informado"}</dd>
                </div>
                <div>
                  <dt>Grupo mercadorias</dt>
                  <dd>{selectedProduct.sap_material_group || "Nao informado"}</dd>
                </div>
                <div>
                  <dt>Origem dos dados</dt>
                  <dd>{selectedProduct.sync_source || "manual"}</dd>
                </div>
                <div>
                  <dt>Ultima sincronizacao</dt>
                  <dd>
                    {selectedProduct.last_sync_at
                      ? new Date(selectedProduct.last_sync_at).toLocaleString(
                          "pt-BR"
                        )
                      : "Nunca sincronizado"}
                  </dd>
                </div>
              </dl>

              <div className="text-block">
                <h3>Orientacao de integracao</h3>
                <p>
                  Use o SAP como fonte mestre para codigo material, centro,
                  unidade, grupo de mercadorias, NCM e estrutura oficial. Este
                  app pode manter problemas e acompanhamentos internos sem
                  sobrescrever o cadastro mestre do ERP.
                </p>
              </div>
            </section>
          )}

          {activeTab === "structure" && (
            <section className="tab-panel" aria-label="Estrutura do produto">
              <form className="compact-form" onSubmit={onAddStructureItem}>
                <label>
                  Codigo materia prima
                  <input
                    name="materialCode"
                    onChange={onUpdateStructureField}
                    placeholder="Ex.: MP-0001"
                    required
                    value={structureForm.materialCode}
                  />
                </label>
                <label>
                  Descricao do item
                  <input
                    name="description"
                    onChange={onUpdateStructureField}
                    placeholder="Ex.: Chapa inox 2mm"
                    required
                    value={structureForm.description}
                  />
                </label>
                <label>
                  Quantidade
                  <input
                    min="0.01"
                    name="quantity"
                    onChange={onUpdateStructureField}
                    placeholder="Ex.: 2"
                    required
                    step="0.01"
                    type="number"
                    value={structureForm.quantity}
                  />
                </label>
                <button disabled={isAddingStructure} type="submit">
                  {isAddingStructure ? "Adicionando..." : "Adicionar"}
                </button>
              </form>

              <div className="data-list">
                {selectedStructureItems.map((item) => (
                  <div className="data-row" key={item.id}>
                    <span>
                      <strong>{item.material_code}</strong>
                      <small>{item.description}</small>
                    </span>
                    <span className="quantity-pill">{item.quantity}</span>
                    <button
                      className="ghost-danger-button"
                      onClick={() => onDeleteStructureItem(item.id)}
                      type="button"
                    >
                      Excluir
                    </button>
                  </div>
                ))}

                {selectedStructureItems.length === 0 && (
                  <p className="empty-state">Nenhum item na estrutura.</p>
                )}
              </div>
            </section>
          )}

          {activeTab === "issues" && (
            <section className="tab-panel" aria-label="Problemas do produto">
              <form className="compact-form issue-form" onSubmit={onAddIssue}>
                <label>
                  Codigo do produto
                  <input
                    name="productCode"
                    onChange={onUpdateIssueField}
                    placeholder={selectedProduct.code}
                    required
                    value={issueForm.productCode}
                  />
                </label>
                <label>
                  Problema
                  <input
                    name="description"
                    onChange={onUpdateIssueField}
                    placeholder="Descreva o problema encontrado"
                    required
                    value={issueForm.description}
                  />
                </label>
                <button disabled={isAddingIssue} type="submit">
                  {isAddingIssue ? "Registrando..." : "Registrar"}
                </button>
              </form>

              <div className="data-list">
                {selectedIssues.map((issue) => (
                  <div className="data-row issue-row" key={issue.id}>
                    <span>
                      <strong>{issue.product_code}</strong>
                      <small>{issue.description}</small>
                    </span>
                    <button onClick={() => onResolveIssue(issue)} type="button">
                      Resolver
                    </button>
                  </div>
                ))}

                {selectedIssues.length === 0 && (
                  <p className="empty-state">
                    Nenhum problema aberto para este produto.
                  </p>
                )}
              </div>
            </section>
          )}

          {activeTab === "fiscal" && (
            <section className="tab-panel" aria-label="Dados fiscais">
              <dl className="detail-grid fiscal-summary">
                <div>
                  <dt>NCM</dt>
                  <dd>{selectedProduct.ncm || "Nao informado"}</dd>
                </div>
                <div>
                  <dt>Base fiscal</dt>
                  <dd>{selectedNcmTax ? "Cadastrada" : "Pendente"}</dd>
                </div>
                <div>
                  <dt>Atualizacao</dt>
                  <dd>
                    {selectedNcmTax?.updated_at
                      ? new Date(selectedNcmTax.updated_at).toLocaleDateString(
                          "pt-BR"
                        )
                      : "Nao informado"}
                  </dd>
                </div>
              </dl>

              <div className="text-block">
                <h3>Impostos por NCM</h3>
                {selectedNcmTax ? (
                  <>
                    <p>{selectedNcmTax.description}</p>
                    <dl className="tax-grid">
                      <div>
                        <dt>IPI</dt>
                        <dd>{formatRate(selectedNcmTax.ipi_rate)}</dd>
                      </div>
                      <div>
                        <dt>PIS</dt>
                        <dd>{formatRate(selectedNcmTax.pis_rate)}</dd>
                      </div>
                      <div>
                        <dt>COFINS</dt>
                        <dd>{formatRate(selectedNcmTax.cofins_rate)}</dd>
                      </div>
                      <div>
                        <dt>ICMS</dt>
                        <dd>{formatRate(selectedNcmTax.icms_rate)}</dd>
                      </div>
                      <div>
                        <dt>II</dt>
                        <dd>{formatRate(selectedNcmTax.import_tax_rate)}</dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <p>
                    Nenhuma regra de imposto cadastrada para este NCM no
                    Supabase.
                  </p>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}
