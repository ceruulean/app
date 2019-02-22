<template>
  <not-found v-if="!collectionInfo" />
  <div class="settings-fields" v-else>
    <v-header :breadcrumb="breadcrumb">
      <template slot="buttons">
        <v-header-button
          icon="delete_outline"
          key="delete"
          color="danger"
          :label="$t('delete')"
          @click="confirmRemove = true"
        />
        <v-header-button
          icon="check"
          key="save"
          color="action"
          :loading="saving"
          :disabled="Object.keys(edits).length === 0"
          :label="$t('save')"
          @click="save"
        />
      </template>
    </v-header>

    <label class="label "
      >{{ $t("fields") }}
      <em class="notice">{{ $t("fields_are_saved_instantly") }}</em></label
    >

    <div class="table">
      <div class="header">
        <div class="row">
          <div class="drag"><i class="material-icons">swap_vert</i></div>
          <div>{{ $t("field") }}</div>
          <div>{{ $t("interface") }}</div>
        </div>
      </div>
      <div class="body" :class="{ dragging }">

        <VSettingsFieldList
          :fields="groups"
          @startSort="startSort"
          @saveSort="saveSort"
          @warnRemoveField="warnRemoveField"
          @duplicateField="duplicateField"
          @startEditingField="startEditingField"
          />

      </div>
    </div>

    <v-button @click="startEditingField({})" class="new-field"
      >New Field</v-button
    >

    <v-form
      v-if="fields"
      :fields="directusFields"
      :values="values"
      collection="directus_collections"
      @stage-value="stageValue"
    />

    <portal to="modal" v-if="confirmRemove">
      <v-confirm
        color="danger"
        :message="$t('delete_collection_are_you_sure')"
        :confirm-text="$t('delete')"
        @cancel="confirmRemove = false"
        @confirm="remove"
      />
    </portal>

    <portal to="modal" v-if="confirmFieldRemove">
      <v-confirm
        color="danger"
        :message="$t('delete_field_are_you_sure', { field: fieldToBeRemoved.field })"
        :confirm-text="$t('delete')"
        @cancel="confirmFieldRemove = false"
        @confirm="removeField(fieldToBeRemoved)"
      />
    </portal>

    <v-field-setup
      v-if="editingField"
      :field-info="fieldBeingEdited"
      :collection-info="collectionInfo"
      :saving="fieldSaving"
      @close="editingField = false"
      @save="setFieldSettings"
    />

    <v-field-duplicate
      v-if="duplicatingField"
      :field-information="fieldBeingDuplicated"
      :collection-information="collectionInfo"
      @close="duplicatingField = false"
      @save="duplicateFieldSettings"
    />
  </div>
</template>

<script>
import { keyBy } from "lodash";
import formatTitle from "@directus/format-title";
import shortid from "shortid";
import store from "../../store/";
import api from "../../api.js";
import NotFound from "../not-found.vue";
import VFieldSetup from "../../components/field-setup.vue";
import VFieldDuplicate from "../../components/field-duplicate.vue";
import VSettingsFieldList from "./fieldList.vue";

export default {
  name: "settings-fields",
  metaInfo() {
    return {
      title: `${this.$t("settings")} | ${this.$t("editing", {
        collection: this.$helpers.formatTitle(this.collection)
      })}`
    };
  },
  components: {
    NotFound,
    VFieldSetup,
    VFieldDuplicate,
    VSettingsFieldList
  },
  props: {
    collection: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      duplicateInterfaceBlacklist: [
        "primary-key",
        "many-to-many",
        "one-to-many",
        "many-to-one",
        "sort"
      ],
      fieldSaving: false,
      saving: false,
      dragging: false,

      fields: null,
      directusFields: null,
      groups: null,

      notFound: false,
      error: false,

      confirmRemove: false,
      confirmRemoveLoading: false,

      confirmNavigation: false,
      leavingTo: "",

      edits: {},

      fieldBeingEdited: null,
      fieldToBeRemoved: null,
      confirmFieldRemove: false,

      fieldBeingDuplicated: null,
      duplicatingField: false,

      editingField: false
    };
  },
  computed: {
    breadcrumb() {
      return [
        {
          name: this.$t("settings"),
          path: "/settings",
          color: "warning"
        },
        {
          name: this.$t("collections_and_fields"),
          path: "/settings/collections"
        },
        {
          name: this.$t(`collections-${this.collection}`),
          path: `/settings/collections/${this.collection}`
        }
      ];
    },
    collectionInfo() {
      return this.$store.state.collections[this.collection];
    },
    fieldsWithSort() {
      return this.fields.map((field, index) => ({
        ...field,
        sort: index + 1
      }));
    },
    values() {
      return {
        ...this.collectionInfo,
        ...this.edits
      };
    },
   fieldTree() {

      var [filtered, nonGroupFields] = this.$lodash.partition(
        Object.values(this.fields),
        field => field.type.toLowerCase() === "group")

      var groupFields = filtered.map(group => ({
          ...group,
          children: []
        }));
      
    var groupedGroups = []

      nonGroupFields.forEach(field => {
        if (field.group != null) {
          const groupIndex = this.$lodash.findIndex(
            groupFields,
            group => group.id === field.group
          );
          return groupFields[groupIndex].children.push(field);
        }
          return groupedGroups.push(field);
      })

      groupFields.forEach((field, index) => {
        const groupIndex = this.$lodash.findIndex(
            groupFields,
            group2 => group2.id === field.group
          );
        if (groupIndex > -1) {
          groupFields[groupIndex].children.push(field);
        } else {
          groupedGroups.push(field);
        }
      })

      const comparator = function (a, b){
        if (a.sort == b.sort) return 0;
        if (a.sort === null) return 1;
        if (b.sort === null) return -1;
        return a.sort > b.sort ? 1 : -1;
      };

      groupFields.forEach(field => field.children.sort(comparator));
        return groupedGroups.sort(comparator);
    },
  },
  watch:{
    fields: {
    deep: true,
    handler() {
      this.groups = [...this.fieldTree];
      }
    }
  },
  methods: {
    remove() {
      const id = this.$helpers.shortid.generate();
      this.$store.dispatch("loadingStart", { id });

      this.$api
        .deleteCollection(this.collection)
        .then(() => {
          this.$store.dispatch("loadingFinished", id);
          this.$store.dispatch("removeCollection", this.collection);
          this.$notify({
            title: this.$t("collection_removed", {
              collection: this.$helpers.formatTitle(this.collection)
            }),
            color: "green",
            iconMain: "check"
          });
          this.$router.push("/settings/collections");
        })
        .catch(error => {
          this.$store.dispatch("loadingFinished", id);
          this.$events.emit("error", {
            notify: this.$t("something_went_wrong_body"),
            error
          });
        });
    },
    save() {
      this.saving = true;

      const id = this.$helpers.shortid.generate();
      this.$store.dispatch("loadingStart", { id });

      this.$api
        .updateCollection(this.collection, this.edits)
        .then(() => {
          this.$notify({
            title: this.$t("collection_updated", {
              collection: this.$helpers.formatTitle(this.collection)
            }),
            color: "green",
            iconMain: "check"
          });
          this.$store.dispatch("loadingFinished", id);
          this.saving = false;
          this.$store.dispatch("updateCollection", {
            collection: this.collection,
            edits: this.edits
          });
          this.$router.push("/settings/collections");
        })
        .catch(error => {
          this.saving = false;
          this.$store.dispatch("loadingFinished", id);
          this.$events.emit("error", {
            notify: this.$t("something_went_wrong_body"),
            error
          });
        });
    },
    stageValue({ field, value }) {
      if (value === this.collectionInfo[field]) {
        this.$delete(this.edits, field);
        return;
      }

      this.$set(this.edits, field, value);
    },
    canDuplicate(fieldInterface) {
      return (
        this.duplicateInterfaceBlacklist.includes(fieldInterface) === false
      );
    },
    duplicateFieldSettings({ fieldInfo, collection }) {
      const requests = [];

      const id = this.$helpers.shortid.generate();
      this.$store.dispatch("loadingStart", { id });

      fieldInfo.collection = collection;
      requests.push(this.$api.createField(collection, fieldInfo));

      return Promise.all(requests)
        .then(([fieldRes]) => ({
          savedFieldInfo: fieldRes.data
        }))
        .then(({ savedFieldInfo }) => {
          this.$store.dispatch("loadingFinished", id);

          if (this.collection === collection) {
            this.fields = [...this.fields, savedFieldInfo];
          }
          this.$store.dispatch("addField", {
            collection: collection,
            field: savedFieldInfo
          });
          this.$notify({
            title: this.$t("field_created", {
              field: this.$helpers.formatTitle(fieldInfo.field)
            }),
            color: "green",
            iconMain: "check"
          });
        })
        .then(() => {
          this.duplicatingField = false;
          this.fieldBeingDuplicated = null;
        })
        .catch(error => {
          this.$store.dispatch("loadingFinished", id);
          this.$events.emit("error", {
            notify: this.$t("something_went_wrong_body"),
            error
          });
        });
    },
    setFieldSettings({ fieldInfo, relation }) {
      this.fieldSaving = true;

      const existingField = this.$store.state.collections[
        this.collection
      ].fields.hasOwnProperty(fieldInfo.field);

      const requests = [];

      const id = this.$helpers.shortid.generate();
      this.$store.dispatch("loadingStart", { id });

      if (existingField) {
        requests.push(
          this.$api.updateField(this.collection, fieldInfo.field, fieldInfo)
        );
      } else {
        delete fieldInfo.id;
        fieldInfo.collection = this.collection;
        requests.push(this.$api.createField(this.collection, fieldInfo));
      }

      if (relation) {
        const saveRelation = relation => {
          const existingRelation = relation && relation.id != null;
          if (existingRelation) {
            requests.push(this.$api.updateRelation(relation.id, relation));
          } else {
            delete relation.id;
            requests.push(this.$api.createRelation(relation));
          }
        };

        if (Array.isArray(relation)) {
          relation.forEach(saveRelation);
        } else {
          saveRelation(relation);
        }
      }

      return Promise.all(requests)
        .then(([fieldRes, relationRes]) => ({
          savedFieldInfo: fieldRes.data,
          savedRelationInfo: relationRes && relationRes.data
        }))
        .then(({ savedFieldInfo, savedRelationInfo }) => {
          this.$store.dispatch("loadingFinished", id);

          if (existingField) {
            this.fields = this.fields.map(field => {
              if (field.id === savedFieldInfo.id) return savedFieldInfo;
              return field;
            });

            this.$notify({
              title: this.$t("field_updated", {
                field: this.$helpers.formatTitle(fieldInfo.field)
              }),
              color: "green",
              iconMain: "check"
            });

            this.$store.dispatch("updateField", {
              collection: this.collection,
              field: savedFieldInfo
            });
          } else {
            this.fields = [...this.fields, savedFieldInfo];

            this.$notify({
              title: this.$t("field_created", {
                field: this.$helpers.formatTitle(fieldInfo.field)
              }),
              color: "green",
              iconMain: "check"
            });

            this.$store.dispatch("addField", {
              collection: this.collection,
              field: savedFieldInfo
            });
          }

          if (relation) {
            const saveRelation = relation => {
              const existingRelation = relation && relation.id != null;
              if (existingRelation) {
                this.$store.dispatch("updateRelation", savedRelationInfo);
              } else {
                this.$store.dispatch("addRelation", savedRelationInfo);
              }
            };

            if (Array.isArray(relation)) {
              relation.forEach(saveRelation);
            } else {
              saveRelation(relation);
            }
          }
        })
        .then(() => {
          this.editingField = false;
          this.fieldBeingEdited = null;
        })
        .catch(error => {
          this.$store.dispatch("loadingFinished", id);
          this.$events.emit("error", {
            notify: this.$t("something_went_wrong_body"),
            error
          });
        })
        .finally(() => {
          this.fieldSaving = false;
        });
    },
    duplicateField(field) {
      this.fieldBeingDuplicated = field;
      this.duplicatingField = true;
    },
    startEditingField(field) {
      this.fieldBeingEdited = field;
      this.editingField = true;
    },
    warnRemoveField(field) {
      this.fieldToBeRemoved = field;
      this.confirmFieldRemove = true;
    },
    removeField(fieldToDelete) {
      this.removingField = true;
      const fieldName = fieldToDelete.field;
      const id = this.$helpers.shortid.generate();
      this.$store.dispatch("loadingStart", { id });

      this.$api
        .deleteField(this.collection, fieldName)
        .then(() => {
          this.$store.dispatch("loadingFinished", id);
          this.fields = this.fields.filter(({ field }) => field !== fieldName);
          //delete group relations
          if (fieldToDelete.type == "group") {
            this.saveSort(this.fields.filter(fieldG => 
              fieldG.group == fieldToDelete.id
              )
              .map(related => {
                return {
                field: related.field,
                sort: related.sort,
                group: null
                }
              }))
          }
          
          this.removingField = false;
          this.fieldToBeRemoved = null;
          this.confirmFieldRemove = false;
          this.$notify({
            title: this.$t("field_removed", {
              field: this.$helpers.formatTitle(fieldName)
            }),
            color: "green",
            iconMain: "check"
          });
          this.$store.dispatch("removeField", {
            collection: this.collection,
            field: fieldName
          });
        })
        .catch(error => {
          this.$store.dispatch("loadingFinished", id);
          this.$events.emit("error", {
            notify: this.$t("something_went_wrong_body"),
            error
          });
        });
    },
    startSort() {
      this.dragging = true;
    },
    saveSort(deltas) {
      this.dragging = false;
      const fieldUpdates = this.fields.map((field) => {
        const found = this.$lodash.find(deltas, ['field', field.field]);
        if (found) {
          return {
          field: field.field,
          sort : found.sort,
          group : found.group
          }
        } else {
            return {
              field: field.field,
            }
          }
        });

      const id = this.$helpers.shortid.generate();
      this.$store.dispatch("loadingStart", { id });

      this.$api
        .patch(`/fields/${this.collection}`, fieldUpdates, {
          activity_skip: 1
        })
        .then(res => res.data)
        .then(fields => {
          this.$store.dispatch("loadingFinished", id);
          this.$store.dispatch("updateFields", {
            collection: this.collection,
            updates: fieldUpdates
          });
          this.fields = fields;
        })
        .catch(error => {
          this.$store.dispatch("loadingFinished", id);
          this.$events.emit("error", {
            notify: this.$t("something_went_wrong_body"),
            error
          });
        });
    }
  },
  beforeRouteEnter(to, from, next) {
    const { collection } = to.params;

    const id = shortid.generate();
    store.dispatch("loadingStart", { id });

    return Promise.all([
      api.getFields("directus_collections"),
      api.getFields(collection, {
        sort: "sort"
      })
    ])
      .then(([directusRes, fieldsRes]) => ({
        directusFields: directusRes.data,
        fields: fieldsRes.data
      }))
      .then(({ directusFields, fields }) => {
        store.dispatch("loadingFinished", id);
        next(vm => {
          vm.$data.directusFields = keyBy(
            directusFields.map(field => ({
              ...field,
              name: formatTitle(field.field),
              note: vm.$t("note_" + field.field)
            })),
            "field"
          );
          delete vm.$data.directusFields.note.note;
          vm.$data.directusFields.note.options = {
            placeholder: vm.$t("note_note")
          };

          vm.$data.fields = fields
            .map(field => ({
              ...field,
              name: formatTitle(field.field)
            }))
            .sort((a, b) => {
              if (a.sort == b.sort) return 0;
              if (a.sort === null) return 1;
              if (b.sort === null) return -1;
              return a.sort > b.sort ? 1 : -1;
            });
        });
      })
      .catch(error => {
        store.dispatch("loadingFinished", id);
        next(vm => {
          vm.$data.error = error;
        });
      });
  }
};
</script>

<style lang="scss" scoped>
.settings-fields {
  padding: var(--page-padding);
}

h2 {
  margin-bottom: 20px;

  &:not(:first-of-type) {
    margin-top: 60px;
  }
}

.table {

  background-color: var(--white);
  border: var(--input-border-width) solid var(--lighter-gray);
  border-radius: var(--border-radius);
  border-spacing: 0;
  width: 100%;
  max-width: 1000px;
  margin: 10px 0 20px;

  .header {
    color: var(--gray);
    font-size: 10px;
    text-transform: uppercase;
    font-weight: 700;
    border-bottom: 1px solid var(--lightest-gray);
    height: 60px;
    .row {
      height: 60px;
    }
  }

  .sortable-drag {
    opacity: 0;
  }

  .dragging .sortable-chosen,
  .sortable-chosen:active {
    background-color: var(--highlight) !important;
    color: var(--accent);

    .manual-sort {
      color: var(--accent);
    }
  }

  .body {
    &.dragging .row:hover {
      background-color: var(--white);
    }

    .row {
      cursor: pointer;
      position: relative;
      height: 40px;
      border-bottom: 1px solid var(--lightest-gray);

      &:hover {
        background-color: var(--highlight);
      }

      .required {
        color: var(--accent);
        vertical-align: super;
        font-size: 7px;
      }

      .key {
        color: var(--light-gray);
        font-size: 16px;
        vertical-align: -3px;
        margin-left: 2px;
      }
    }

    .drag {
      user-select: none;
      cursor: -webkit-grab;
      color: var(--lighter-gray);

      &:hover {
        color: var(--dark-gray);
      }
    }
  }
}

.new-field {
  margin-bottom: 40px;
}

em.note {
  color: var(--lighter-gray);
  margin-top: 4px;
  margin-bottom: 40px;
  display: block;
}

.notice {
  margin-left: 4px;
  background-color: var(--warning);
  border-radius: var(--border-radius);
  color: var(--white);
  padding: 3px 6px;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 600;
  font-style: normal;
}

label.label {
  margin-bottom: 10px;
  text-transform: none;
  color: var(--darker-gray);
  font-size: 1.2rem;
  line-height: 1.1;
  font-weight: 400;
}

.row {
    display: flex;
    align-items: center;
    height: 40px;
    > div {
      padding: 5px 5px;

      &:not(.drag):not(.more-options) {
        flex-basis: 200px;
      }
  }
}
</style>
