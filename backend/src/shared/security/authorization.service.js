const { Role } = require('../../database/models');

/**
 * Servicio de Autorización Centralizado
 * Implementa las reglas de jerarquía (levels) y ámbito (scope: area/subarea)
 * para la gestión de usuarios.
 */
class AuthorizationService {
  /**
   * Verifica si el usuario actual (actor) tiene permiso para interactuar con un rol objetivo
   * basándose en la jerarquía (level) y el ámbito (area/subarea).
   * 
   * @param {Object} actorRole - Instancia del rol del usuario que realiza la acción
   * @param {Object} targetRole - Instancia del rol sobre el cual se quiere accionar
   * @param {boolean} strictLevel - Si es true, exige que el targetRole.level sea estrictamente menor que actorRole.level
   * @returns {boolean}
   */
  static _hasScopeAccess(actorRole, targetRole, strictLevel = true) {
    if (!actorRole || !targetRole) return false;

    // 1. Verificación de Jerarquía (Level)
    if (strictLevel) {
      if (targetRole.level >= actorRole.level) return false;
    } else {
      if (targetRole.level > actorRole.level) return false;
    }

    // 2. Verificación de Ámbito (Scope)
    const isActorGlobal = actorRole.area_id === null && actorRole.subarea_id === null;
    if (isActorGlobal) {
      return true; // Usuario global (ej. SUPERADMIN) tiene acceso a todas las áreas
    }

    const isActorAreaAdmin = actorRole.area_id !== null && actorRole.subarea_id === null;
    if (isActorAreaAdmin) {
      // Un administrador de área puede gestionar usuarios de su misma área
      return targetRole.area_id === actorRole.area_id;
    }

    const isActorSubareaAdmin = actorRole.area_id !== null && actorRole.subarea_id !== null;
    if (isActorSubareaAdmin) {
      // Un administrador de subárea solo puede gestionar dentro de su subárea específica
      return (
        targetRole.area_id === actorRole.area_id &&
        targetRole.subarea_id === actorRole.subarea_id
      );
    }

    return false;
  }

  /**
   * Determina si el actor puede ver a un usuario.
   * Regla: Puede ver si el rol objetivo está dentro de su scope. 
   * El nivel (level) no tiene que ser estrictamente menor, puede ser igual (ej. ver a un par),
   * o incluso mayor si la política de la empresa lo requiere, pero limitaremos a <= level por seguridad.
   */
  static canViewUser(actorRole, targetUserRole) {
    // Para ver, permitimos nivel igual (strictLevel = false)
    return this._hasScopeAccess(actorRole, targetUserRole, false);
  }

  /**
   * Determina si el actor puede gestionar (editar/actualizar perfil) a un usuario.
   * Regla: Puede gestionar si el targetUserRole.level < actorRole.level y está en su scope.
   */
  static canManageUser(actorRole, targetUserRole) {
    return this._hasScopeAccess(actorRole, targetUserRole, true);
  }

  /**
   * Determina si el actor puede deshabilitar a un usuario.
   * Regla: Igual a canManageUser.
   */
  static canDisableUser(actorRole, targetUserRole) {
    return this._hasScopeAccess(actorRole, targetUserRole, true);
  }

  /**
   * Determina si el actor puede asignar un rol específico a un nuevo o existente usuario.
   * Regla: Puede asignar si newRole.level < actorRole.level y está en su scope.
   */
  static canAssignRole(actorRole, newRole) {
    return this._hasScopeAccess(actorRole, newRole, true);
  }

  /**
   * Determina si el actor puede cambiar el rol de un usuario existente.
   * Regla: Debe tener permisos sobre el rol ACTUAL del usuario Y sobre el NUEVO rol.
   */
  static canChangeRole(actorRole, currentTargetRole, newTargetRole) {
    const canManageCurrent = this.canManageUser(actorRole, currentTargetRole);
    const canAssignNew = this.canAssignRole(actorRole, newTargetRole);
    return canManageCurrent && canAssignNew;
  }
}

module.exports = AuthorizationService;
